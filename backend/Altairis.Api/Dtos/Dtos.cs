using System.ComponentModel.DataAnnotations;
using Altairis.Api.Models;

namespace Altairis.Api.Dtos;

// Pagination
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

// Auth
public record LoginRequest([Required] string Email, [Required] string Password);
public record RegisterRequest([Required] string Email, [Required] string Password, string? FullName);
public record AuthResponse(string Token, string Email, string FullName, DateTime ExpiresAt);
public record MeResponse(string Email, string FullName);

// Hotel
public record HotelDto(
    Guid Id,
    string Name,
    string Country,
    string City,
    string Address,
    int Stars,
    HotelCategory Category,
    string Email,
    string Phone,
    bool IsActive,
    int RoomTypesCount);

public record HotelCreateRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(100)] string Country,
    [Required, MaxLength(100)] string City,
    string? Address,
    [Range(1, 5)] int Stars,
    HotelCategory Category,
    string? Email,
    string? Phone);

// RoomType
public record RoomTypeDto(
    Guid Id,
    Guid HotelId,
    string Name,
    int Capacity,
    decimal BasePrice,
    string Description,
    int TotalRooms);

public record RoomTypeCreateRequest(
    [Required] Guid HotelId,
    [Required, MaxLength(100)] string Name,
    [Range(1, 20)] int Capacity,
    [Range(0, 100000)] decimal BasePrice,
    string? Description,
    [Range(1, 10000)] int TotalRooms);

// Inventory
public record InventoryDayDto(
    Guid Id,
    Guid RoomTypeId,
    string RoomTypeName,
    DateOnly Date,
    int AvailableRooms,
    decimal Price);

public record InventoryUpsertRequest(
    [Required] Guid RoomTypeId,
    DateOnly Date,
    [Range(0, 10000)] int AvailableRooms,
    [Range(0, 100000)] decimal Price);

public record InventoryPatchRequest(
    [Range(0, 10000)] int AvailableRooms,
    [Range(0, 100000)] decimal Price);

// Reservation
public record ReservationDto(
    Guid Id,
    string Code,
    Guid HotelId,
    string HotelName,
    Guid RoomTypeId,
    string RoomTypeName,
    string GuestName,
    string GuestEmail,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int Rooms,
    decimal TotalPrice,
    ReservationStatus Status,
    DateTime CreatedAt);

public record ReservationCreateRequest(
    [Required] Guid HotelId,
    [Required] Guid RoomTypeId,
    [Required, MaxLength(200)] string GuestName,
    [Required, EmailAddress] string GuestEmail,
    DateOnly CheckIn,
    DateOnly CheckOut,
    [Range(1, 50)] int Rooms);

public record ReservationStatusPatch(ReservationStatus Status);

// Dashboard
public record DashboardSummary(
    int TotalHoteles,
    int HotelesActivos,
    int TotalReservas,
    int ReservasHoy,
    double OcupacionPct,
    decimal IngresosEstimados30d,
    IReadOnlyList<DashboardTrendPoint> Tendencia7d,
    IReadOnlyList<DashboardStatusCount> ReservasPorEstado,
    IReadOnlyList<ReservationDto> UltimasReservas);

public record DashboardTrendPoint(DateOnly Date, int Reservas);
public record DashboardStatusCount(ReservationStatus Status, int Count);

// SignalR payloads
public record InventoryUpdatedEvent(Guid HotelId, Guid RoomTypeId, DateOnly Date, int AvailableRooms, decimal Price);
public record ReservationCreatedEvent(Guid ReservationId, string Code, Guid HotelId, ReservationStatus Status);

// RoomMaintenance
public record RoomMaintenanceDto(
    Guid Id,
    Guid HotelId, string HotelName,
    Guid RoomTypeId, string RoomTypeName,
    string RoomIdentifier,
    string Title, string Description,
    MaintenancePriority Priority,
    MaintenanceStatus Status,
    DateOnly AffectedFrom, DateOnly AffectedTo,
    bool InventoryBlocked,
    DateTime CreatedAt, DateTime? ResolvedAt);

public record RoomMaintenanceCreateRequest(
    [Required] Guid HotelId,
    [Required] Guid RoomTypeId,
    [Required, MaxLength(100)] string RoomIdentifier,
    [Required, MaxLength(200)] string Title,
    string? Description,
    MaintenancePriority Priority,
    DateOnly AffectedFrom,
    DateOnly AffectedTo,
    bool BlockInventory);

public record RoomMaintenanceStatusPatch(MaintenanceStatus Status);
