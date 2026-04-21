using Altairis.Api.Data;
using Altairis.Api.Dtos;
using Altairis.Api.Hubs;
using Altairis.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly AltairisDbContext _db;
    private readonly IHubContext<AvailabilityHub> _hub;

    public ReservationsController(AltairisDbContext db, IHubContext<AvailabilityHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    internal static ReservationDto ToDto(Reservation r) => new(
        r.Id, r.Code,
        r.HotelId, r.Hotel?.Name ?? string.Empty,
        r.RoomTypeId, r.RoomType?.Name ?? string.Empty,
        r.GuestName, r.GuestEmail,
        r.CheckIn, r.CheckOut, r.Rooms,
        r.TotalPrice, r.Status, r.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<PagedResult<ReservationDto>>> Get(
        [FromQuery] ReservationStatus? status,
        [FromQuery] Guid? hotelId,
        [FromQuery] string? guest,
        [FromQuery] DateOnly? checkFrom,
        [FromQuery] DateOnly? checkTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Reservations.AsNoTracking()
            .Include(r => r.Hotel)
            .Include(r => r.RoomType)
            .AsQueryable();

        if (status.HasValue)  q = q.Where(r => r.Status == status.Value);
        if (hotelId.HasValue) q = q.Where(r => r.HotelId == hotelId.Value);
        if (!string.IsNullOrWhiteSpace(guest))
        {
            var g = guest.Trim().ToLower();
            q = q.Where(r => r.GuestName.ToLower().Contains(g) || r.GuestEmail.ToLower().Contains(g));
        }
        if (checkFrom.HasValue) q = q.Where(r => r.CheckIn >= checkFrom.Value);
        if (checkTo.HasValue)   q = q.Where(r => r.CheckOut <= checkTo.Value);

        var total = await q.CountAsync();
        var entities = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = entities.Select(ToDto).ToList();
        return Ok(new PagedResult<ReservationDto>(items, total, page, pageSize));
    }

    [HttpPost]
    public async Task<ActionResult<ReservationDto>> Create(ReservationCreateRequest req)
    {
        if (req.CheckOut <= req.CheckIn)
            return BadRequest(new { message = "CheckOut debe ser posterior a CheckIn" });

        var roomType = await _db.RoomTypes.FirstOrDefaultAsync(r => r.Id == req.RoomTypeId && r.HotelId == req.HotelId);
        if (roomType == null) return NotFound(new { message = "RoomType no encontrado para el hotel" });

        var nights = req.CheckOut.DayNumber - req.CheckIn.DayNumber;
        var dates = Enumerable.Range(0, nights).Select(d => req.CheckIn.AddDays(d)).ToList();

        var inv = await _db.InventoryDays
            .Where(i => i.RoomTypeId == req.RoomTypeId && i.Date >= req.CheckIn && i.Date < req.CheckOut)
            .ToListAsync();

        var invByDate = inv.ToDictionary(i => i.Date);

        foreach (var date in dates)
        {
            if (!invByDate.TryGetValue(date, out var day))
                return BadRequest(new { message = $"Sin inventario para {date:yyyy-MM-dd}" });
            if (day.AvailableRooms < req.Rooms)
                return BadRequest(new { message = $"Disponibilidad insuficiente el {date:yyyy-MM-dd} (quedan {day.AvailableRooms})" });
        }

        decimal total = 0;
        foreach (var date in dates)
        {
            var day = invByDate[date];
            day.AvailableRooms -= req.Rooms;
            total += day.Price * req.Rooms;
        }

        var reservation = new Reservation
        {
            HotelId = req.HotelId,
            RoomTypeId = req.RoomTypeId,
            GuestName = req.GuestName,
            GuestEmail = req.GuestEmail,
            CheckIn = req.CheckIn,
            CheckOut = req.CheckOut,
            Rooms = req.Rooms,
            TotalPrice = total,
            Status = ReservationStatus.Confirmed
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        // broadcast SignalR events
        foreach (var date in dates)
        {
            var day = invByDate[date];
            await _hub.Clients.Group($"hotel:{req.HotelId}")
                .SendAsync("InventoryUpdated",
                    new InventoryUpdatedEvent(req.HotelId, day.RoomTypeId, day.Date, day.AvailableRooms, day.Price));
        }

        await _hub.Clients.All.SendAsync("ReservationCreated",
            new ReservationCreatedEvent(reservation.Id, reservation.Code, reservation.HotelId, reservation.Status));

        var hotel = await _db.Hotels.AsNoTracking().FirstAsync(h => h.Id == req.HotelId);
        reservation.Hotel = hotel;
        reservation.RoomType = roomType;

        return Ok(ToDto(reservation));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ReservationDto>> PatchStatus(Guid id, ReservationStatusPatch req)
    {
        var r = await _db.Reservations.Include(x => x.Hotel).Include(x => x.RoomType).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        r.Status = req.Status;
        await _db.SaveChangesAsync();

        return Ok(ToDto(r));
    }
}
