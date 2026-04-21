using Altairis.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Data;

public class AltairisDbContext : IdentityDbContext<ApplicationUser>
{
    public AltairisDbContext(DbContextOptions<AltairisDbContext> options) : base(options) { }

    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<InventoryDay> InventoryDays => Set<InventoryDay>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<RoomMaintenance> RoomMaintenances => Set<RoomMaintenance>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Hotel>(e =>
        {
            e.HasIndex(x => x.Name);
            e.HasIndex(x => x.Country);
            e.HasIndex(x => x.City);
            e.Property(x => x.Category).HasConversion<string>().HasMaxLength(32);
        });

        builder.Entity<RoomType>(e =>
        {
            e.HasIndex(x => x.HotelId);
            e.Property(x => x.BasePrice).HasColumnType("numeric(10,2)");
            e.HasOne(x => x.Hotel)
                .WithMany(h => h.RoomTypes)
                .HasForeignKey(x => x.HotelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InventoryDay>(e =>
        {
            e.HasIndex(x => new { x.RoomTypeId, x.Date }).IsUnique();
            e.HasIndex(x => x.Date);
            e.Property(x => x.Price).HasColumnType("numeric(10,2)");
            e.HasOne(x => x.RoomType)
                .WithMany(r => r.InventoryDays)
                .HasForeignKey(x => x.RoomTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Reservation>(e =>
        {
            e.HasIndex(x => x.HotelId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.TotalPrice).HasColumnType("numeric(12,2)");
            e.Ignore(x => x.Code);
            e.HasOne(x => x.Hotel)
                .WithMany(h => h.Reservations)
                .HasForeignKey(x => x.HotelId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RoomType)
                .WithMany()
                .HasForeignKey(x => x.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RoomMaintenance>(e =>
        {
            e.HasIndex(x => x.HotelId);
            e.HasIndex(x => x.RoomTypeId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Priority).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            e.HasOne(x => x.Hotel)
                .WithMany()
                .HasForeignKey(x => x.HotelId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RoomType)
                .WithMany()
                .HasForeignKey(x => x.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
