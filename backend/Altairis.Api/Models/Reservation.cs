using System.ComponentModel.DataAnnotations;

namespace Altairis.Api.Models;

public enum ReservationStatus
{
    Pending,
    Confirmed,
    Cancelled,
    CheckedIn,
    CheckedOut
}

public class Reservation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    [Required, MaxLength(200)]
    public string GuestName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string GuestEmail { get; set; } = string.Empty;

    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }

    [Range(1, 50)]
    public int Rooms { get; set; } = 1;

    public decimal TotalPrice { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string Code => $"RES-{Id.ToString("N")[..8].ToUpperInvariant()}";
}
