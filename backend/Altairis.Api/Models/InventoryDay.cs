namespace Altairis.Api.Models;

public class InventoryDay
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public DateOnly Date { get; set; }

    public int AvailableRooms { get; set; }

    public decimal Price { get; set; }
}
