using System.ComponentModel.DataAnnotations;

namespace Altairis.Api.Models;

public class RoomType
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(1, 20)]
    public int Capacity { get; set; }

    [Range(0, 100000)]
    public decimal BasePrice { get; set; }

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Range(1, 10000)]
    public int TotalRooms { get; set; }

    public List<InventoryDay> InventoryDays { get; set; } = new();
}
