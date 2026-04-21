using System.ComponentModel.DataAnnotations;

namespace Altairis.Api.Models;

public enum MaintenancePriority { Low, Medium, High, Critical }
public enum MaintenanceStatus  { Open, InProgress, Resolved }

public class RoomMaintenance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HotelId { get; set; }
    public Hotel? Hotel { get; set; }
    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }
    [Required, MaxLength(100)]
    public string RoomIdentifier { get; set; } = string.Empty;
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Medium;
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Open;
    public DateOnly AffectedFrom { get; set; }
    public DateOnly AffectedTo { get; set; }
    public bool InventoryBlocked { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
