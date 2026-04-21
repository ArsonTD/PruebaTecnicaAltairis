using Altairis.Api.Data;
using Altairis.Api.Dtos;
using Altairis.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AltairisDbContext _db;

    public DashboardController(AltairisDbContext db) => _db = db;

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummary>> Summary()
    {
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var haceSiete = hoy.AddDays(-6);
        var en30 = hoy.AddDays(30);

        var totalHoteles = await _db.Hotels.CountAsync();
        var hotelesActivos = await _db.Hotels.CountAsync(h => h.IsActive);
        var totalReservas = await _db.Reservations.CountAsync();
        var reservasHoy = await _db.Reservations
            .CountAsync(r => r.CheckIn <= hoy && r.CheckOut > hoy && r.Status != ReservationStatus.Cancelled);

        var invRange = await _db.InventoryDays
            .Where(i => i.Date >= hoy && i.Date <= en30)
            .ToListAsync();

        var roomTypeTotals = await _db.RoomTypes.AsNoTracking()
            .ToDictionaryAsync(r => r.Id, r => r.TotalRooms);

        double ocupacionPct = 0;
        decimal ingresosEstimados = 0;
        if (invRange.Count > 0)
        {
            long totalCapacity = 0;
            long totalOccupied = 0;
            foreach (var inv in invRange)
            {
                if (!roomTypeTotals.TryGetValue(inv.RoomTypeId, out var cap)) continue;
                totalCapacity += cap;
                totalOccupied += Math.Max(0, cap - inv.AvailableRooms);
                ingresosEstimados += inv.Price * Math.Max(0, cap - inv.AvailableRooms);
            }
            if (totalCapacity > 0)
                ocupacionPct = Math.Round((double)totalOccupied * 100.0 / totalCapacity, 1);
        }

        var trendRaw = await _db.Reservations
            .Where(r => r.CreatedAt >= DateTime.UtcNow.AddDays(-7))
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var trend = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var d = haceSiete.AddDays(i);
                var match = trendRaw.FirstOrDefault(t => DateOnly.FromDateTime(t.Date) == d);
                return new DashboardTrendPoint(d, match?.Count ?? 0);
            })
            .ToList();

        var porEstado = await _db.Reservations
            .GroupBy(r => r.Status)
            .Select(g => new DashboardStatusCount(g.Key, g.Count()))
            .ToListAsync();

        var ultimasEntities = await _db.Reservations.AsNoTracking()
            .Include(r => r.Hotel).Include(r => r.RoomType)
            .OrderByDescending(r => r.CreatedAt)
            .Take(8)
            .ToListAsync();
        var ultimas = ultimasEntities.Select(ReservationsController.ToDto).ToList();

        return Ok(new DashboardSummary(
            totalHoteles, hotelesActivos, totalReservas, reservasHoy,
            ocupacionPct, ingresosEstimados, trend, porEstado, ultimas));
    }
}
