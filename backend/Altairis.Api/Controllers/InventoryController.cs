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
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly AltairisDbContext _db;
    private readonly IHubContext<AvailabilityHub> _hub;

    public InventoryController(AltairisDbContext db, IHubContext<AvailabilityHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InventoryDayDto>>> Get(
        [FromQuery] Guid hotelId,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to)
    {
        if (hotelId == Guid.Empty) return BadRequest(new { message = "hotelId requerido" });
        if (to < from) return BadRequest(new { message = "'to' debe ser >= 'from'" });

        var items = await _db.InventoryDays.AsNoTracking()
            .Where(i => i.RoomType!.HotelId == hotelId && i.Date >= from && i.Date <= to)
            .Select(i => new InventoryDayDto(
                i.Id, i.RoomTypeId, i.RoomType!.Name, i.Date, i.AvailableRooms, i.Price))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<InventoryDayDto>> Upsert(InventoryUpsertRequest req)
    {
        var roomType = await _db.RoomTypes.FirstOrDefaultAsync(r => r.Id == req.RoomTypeId);
        if (roomType == null) return NotFound(new { message = "RoomType no encontrado" });

        var existing = await _db.InventoryDays
            .FirstOrDefaultAsync(i => i.RoomTypeId == req.RoomTypeId && i.Date == req.Date);

        if (existing == null)
        {
            existing = new InventoryDay
            {
                RoomTypeId = req.RoomTypeId,
                Date = req.Date,
                AvailableRooms = req.AvailableRooms,
                Price = req.Price
            };
            _db.InventoryDays.Add(existing);
        }
        else
        {
            existing.AvailableRooms = req.AvailableRooms;
            existing.Price = req.Price;
        }

        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"hotel:{roomType.HotelId}")
            .SendAsync("InventoryUpdated",
                new InventoryUpdatedEvent(roomType.HotelId, existing.RoomTypeId, existing.Date, existing.AvailableRooms, existing.Price));

        return Ok(new InventoryDayDto(existing.Id, existing.RoomTypeId, roomType.Name, existing.Date, existing.AvailableRooms, existing.Price));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<InventoryDayDto>> Patch(Guid id, InventoryPatchRequest req)
    {
        var inv = await _db.InventoryDays.Include(i => i.RoomType).FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();

        inv.AvailableRooms = req.AvailableRooms;
        inv.Price = req.Price;
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"hotel:{inv.RoomType!.HotelId}")
            .SendAsync("InventoryUpdated",
                new InventoryUpdatedEvent(inv.RoomType.HotelId, inv.RoomTypeId, inv.Date, inv.AvailableRooms, inv.Price));

        return Ok(new InventoryDayDto(inv.Id, inv.RoomTypeId, inv.RoomType.Name, inv.Date, inv.AvailableRooms, inv.Price));
    }
}
