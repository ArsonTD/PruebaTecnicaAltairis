using Altairis.Api.Data;
using Altairis.Api.Dtos;
using Altairis.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/roomtypes")]
public class RoomTypesController : ControllerBase
{
    private readonly AltairisDbContext _db;

    public RoomTypesController(AltairisDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomTypeDto>>> Get([FromQuery] Guid? hotelId)
    {
        var q = _db.RoomTypes.AsNoTracking().AsQueryable();
        if (hotelId.HasValue) q = q.Where(r => r.HotelId == hotelId.Value);

        var items = await q
            .OrderBy(r => r.Name)
            .Select(r => new RoomTypeDto(
                r.Id, r.HotelId, r.Name, r.Capacity, r.BasePrice, r.Description, r.TotalRooms))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<RoomTypeDto>> Create(RoomTypeCreateRequest req)
    {
        var hotelExists = await _db.Hotels.AnyAsync(h => h.Id == req.HotelId);
        if (!hotelExists) return NotFound(new { message = "Hotel no encontrado" });

        var rt = new RoomType
        {
            HotelId = req.HotelId,
            Name = req.Name,
            Capacity = req.Capacity,
            BasePrice = req.BasePrice,
            Description = req.Description ?? string.Empty,
            TotalRooms = req.TotalRooms
        };
        _db.RoomTypes.Add(rt);
        await _db.SaveChangesAsync();

        return Ok(new RoomTypeDto(rt.Id, rt.HotelId, rt.Name, rt.Capacity, rt.BasePrice, rt.Description, rt.TotalRooms));
    }
}
