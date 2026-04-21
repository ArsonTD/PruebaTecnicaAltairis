using System.ComponentModel.DataAnnotations;

namespace Altairis.Api.Models;

public enum HotelCategory
{
    Business,
    Resort,
    Boutique,
    City
}

public class Hotel
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Stars { get; set; }

    public HotelCategory Category { get; set; }

    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Phone { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public List<RoomType> RoomTypes { get; set; } = new();
    public List<Reservation> Reservations { get; set; } = new();
}
