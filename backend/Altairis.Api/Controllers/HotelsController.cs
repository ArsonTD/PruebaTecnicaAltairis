using Altairis.Api.Data;
using Altairis.Api.Dtos;
using Altairis.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/hotels")]
public class HotelsController : ControllerBase
{
    private readonly AltairisDbContext _db;

    public HotelsController(AltairisDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<HotelDto>>> Get(
        [FromQuery] string? search,
        [FromQuery] string? country,
        [FromQuery] HotelCategory? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Hotels.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(h =>
                h.Name.ToLower().Contains(s) ||
                h.City.ToLower().Contains(s) ||
                h.Country.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(country))
            q = q.Where(h => h.Country == country);

        if (category.HasValue)
            q = q.Where(h => h.Category == category.Value);

        var total = await q.CountAsync();

        var items = await q
            .OrderBy(h => h.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new HotelDto(
                h.Id, h.Name, h.Country, h.City, h.Address,
                h.Stars, h.Category, h.Email, h.Phone, h.IsActive,
                h.RoomTypes.Count))
            .ToListAsync();

        return Ok(new PagedResult<HotelDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HotelDto>> GetById(Guid id)
    {
        var h = await _db.Hotels.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new HotelDto(
                x.Id, x.Name, x.Country, x.City, x.Address,
                x.Stars, x.Category, x.Email, x.Phone, x.IsActive,
                x.RoomTypes.Count))
            .FirstOrDefaultAsync();

        if (h == null) return NotFound();
        return Ok(h);
    }

    [HttpPost]
    public async Task<ActionResult<HotelDto>> Create(HotelCreateRequest req)
    {
        var hotel = new Hotel
        {
            Name = req.Name,
            Country = req.Country,
            City = req.City,
            Address = req.Address ?? string.Empty,
            Stars = req.Stars,
            Category = req.Category,
            Email = req.Email ?? string.Empty,
            Phone = req.Phone ?? string.Empty,
            IsActive = true
        };

        _db.Hotels.Add(hotel);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = hotel.Id },
            new HotelDto(hotel.Id, hotel.Name, hotel.Country, hotel.City, hotel.Address,
                hotel.Stars, hotel.Category, hotel.Email, hotel.Phone, hotel.IsActive, 0));
    }

    [HttpGet("countries")]
    public async Task<ActionResult<IReadOnlyList<string>>> Countries()
    {
        var list = await _db.Hotels.AsNoTracking()
            .Select(h => h.Country).Distinct().OrderBy(c => c).ToListAsync();
        return Ok(list);
    }
}
