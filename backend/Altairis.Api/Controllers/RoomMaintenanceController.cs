using Altairis.Api.Data;
using Altairis.Api.Dtos;
using Altairis.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/maintenance")]
public class RoomMaintenanceController : ControllerBase
{
    private readonly AltairisDbContext _db;

    public RoomMaintenanceController(AltairisDbContext db)
    {
        _db = db;
    }

    internal static RoomMaintenanceDto ToDto(RoomMaintenance m) => new(
        m.Id,
        m.HotelId,    m.Hotel?.Name ?? string.Empty,
        m.RoomTypeId, m.RoomType?.Name ?? string.Empty,
        m.RoomIdentifier,
        m.Title, m.Description,
        m.Priority, m.Status,
        m.AffectedFrom, m.AffectedTo,
        m.InventoryBlocked,
        m.CreatedAt, m.ResolvedAt);

    [HttpGet]
    public async Task<ActionResult<PagedResult<RoomMaintenanceDto>>> Get(
        [FromQuery] Guid? hotelId,
        [FromQuery] Guid? roomTypeId,
        [FromQuery] MaintenanceStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.RoomMaintenances.AsNoTracking()
            .Include(m => m.Hotel)
            .Include(m => m.RoomType)
            .AsQueryable();

        if (hotelId.HasValue)    q = q.Where(m => m.HotelId == hotelId.Value);
        if (roomTypeId.HasValue) q = q.Where(m => m.RoomTypeId == roomTypeId.Value);
        if (status.HasValue)     q = q.Where(m => m.Status == status.Value);

        var total = await q.CountAsync();
        var entities = await q
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<RoomMaintenanceDto>(entities.Select(ToDto).ToList(), total, page, pageSize));
    }

    [HttpPost]
    public async Task<ActionResult<RoomMaintenanceDto>> Create(RoomMaintenanceCreateRequest req)
    {
        if (req.AffectedTo <= req.AffectedFrom)
            return BadRequest(new { message = "AffectedTo debe ser posterior a AffectedFrom" });

        var roomType = await _db.RoomTypes.FirstOrDefaultAsync(r => r.Id == req.RoomTypeId && r.HotelId == req.HotelId);
        if (roomType == null) return NotFound(new { message = "Tipo de habitación no encontrado para el hotel" });

        var entity = new RoomMaintenance
        {
            HotelId        = req.HotelId,
            RoomTypeId     = req.RoomTypeId,
            RoomIdentifier = req.RoomIdentifier,
            Title          = req.Title,
            Description    = req.Description ?? string.Empty,
            Priority       = req.Priority,
            Status         = MaintenanceStatus.Open,
            AffectedFrom   = req.AffectedFrom,
            AffectedTo     = req.AffectedTo,
            InventoryBlocked = false,
        };

        if (req.BlockInventory)
        {
            var inv = await _db.InventoryDays
                .Where(i => i.RoomTypeId == req.RoomTypeId && i.Date >= req.AffectedFrom && i.Date < req.AffectedTo)
                .ToListAsync();

            foreach (var day in inv)
                day.AvailableRooms = Math.Max(0, day.AvailableRooms - 1);

            entity.InventoryBlocked = true;
        }

        _db.RoomMaintenances.Add(entity);
        await _db.SaveChangesAsync();

        var hotel = await _db.Hotels.AsNoTracking().FirstAsync(h => h.Id == req.HotelId);
        entity.Hotel    = hotel;
        entity.RoomType = roomType;

        return Ok(ToDto(entity));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<RoomMaintenanceDto>> PatchStatus(Guid id, RoomMaintenanceStatusPatch req)
    {
        var entity = await _db.RoomMaintenances
            .Include(m => m.Hotel)
            .Include(m => m.RoomType)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (entity == null) return NotFound();

        var previous = entity.Status;
        entity.Status = req.Status;

        if (req.Status == MaintenanceStatus.Resolved && previous != MaintenanceStatus.Resolved && entity.InventoryBlocked)
        {
            entity.ResolvedAt = DateTime.UtcNow;

            var inv = await _db.InventoryDays
                .Where(i => i.RoomTypeId == entity.RoomTypeId && i.Date >= entity.AffectedFrom && i.Date < entity.AffectedTo)
                .ToListAsync();

            var totalRooms = entity.RoomType!.TotalRooms;
            foreach (var day in inv)
                day.AvailableRooms = Math.Min(day.AvailableRooms + 1, totalRooms);

            entity.InventoryBlocked = false;
        }

        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }
}
