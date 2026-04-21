using Altairis.Api.Models;
using Bogus;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Altairis.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AltairisDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        logger.LogInformation("Ensuring database schema exists...");
        await db.Database.EnsureCreatedAsync();

        await SeedAdminAsync(userManager, logger);

        if (await db.Hotels.AnyAsync())
        {
            logger.LogInformation("Database already seeded (hotels exist). Skipping data seed.");
            return;
        }

        logger.LogInformation("Seeding demo data — this may take ~30s...");

        Randomizer.Seed = new Random(1337);

        var countries = new[]
        {
            ("España", new[] { "Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga", "Bilbao", "Granada", "Palma" }),
            ("México", new[] { "Ciudad de México", "Cancún", "Guadalajara", "Monterrey", "Playa del Carmen", "Puerto Vallarta" }),
            ("Colombia", new[] { "Bogotá", "Medellín", "Cartagena", "Cali", "Santa Marta" }),
            ("Argentina", new[] { "Buenos Aires", "Córdoba", "Mendoza", "Bariloche" }),
            ("Chile", new[] { "Santiago", "Valparaíso", "Viña del Mar", "Puerto Varas" }),
            ("Perú", new[] { "Lima", "Cusco", "Arequipa" }),
            ("Francia", new[] { "París", "Niza", "Lyon", "Marsella" }),
            ("Italia", new[] { "Roma", "Milán", "Florencia", "Venecia", "Nápoles" }),
            ("Portugal", new[] { "Lisboa", "Oporto", "Faro" }),
            ("Estados Unidos", new[] { "Miami", "Nueva York", "Los Ángeles", "Orlando", "Las Vegas" }),
        };

        var hotelFaker = new Faker<Hotel>("es")
            .RuleFor(h => h.Id, _ => Guid.NewGuid())
            .RuleFor(h => h.Name, f =>
            {
                var brand = f.PickRandom(new[] { "Altairis", "Gran", "Royal", "Hotel", "Palacio", "Hacienda", "Villa", "Boutique", "Plaza", "Casa" });
                var suffix = f.PickRandom(new[] { "Real", "Imperial", "Central", "Mediterráneo", "del Mar", "del Sol", "Luxe", "Garden", "Premium", "Suites" });
                return $"{brand} {f.Address.City()} {suffix}";
            })
            .RuleFor(h => h.Stars, f => f.Random.WeightedRandom(new[] { 3, 4, 5, 2 }, new[] { 0.35f, 0.4f, 0.15f, 0.1f }))
            .RuleFor(h => h.Category, f => f.PickRandom<HotelCategory>())
            .RuleFor(h => h.Address, f => f.Address.StreetAddress())
            .RuleFor(h => h.Email, f => f.Internet.Email().ToLower())
            .RuleFor(h => h.Phone, f => f.Phone.PhoneNumber("+## ### ### ###"))
            .RuleFor(h => h.IsActive, f => f.Random.Bool(0.93f))
            .RuleFor(h => h.CreatedAt, f => f.Date.Past(3).ToUniversalTime());

        db.ChangeTracker.AutoDetectChangesEnabled = false;

        const int HOTEL_COUNT = 1500;
        var hotels = new List<Hotel>(HOTEL_COUNT);
        var rng = new Random(42);
        for (int i = 0; i < HOTEL_COUNT; i++)
        {
            var h = hotelFaker.Generate();
            var (country, cities) = countries[rng.Next(countries.Length)];
            h.Country = country;
            h.City = cities[rng.Next(cities.Length)];
            hotels.Add(h);
        }

        logger.LogInformation("Inserting {Count} hotels...", hotels.Count);
        await db.BulkInsertAsync(hotels);

        // Room types
        var roomTypeNames = new[]
        {
            ("Individual", 1, 60m, 5),
            ("Doble Estándar", 2, 90m, 15),
            ("Doble Superior", 2, 120m, 10),
            ("Triple", 3, 140m, 6),
            ("Familiar", 4, 180m, 4),
            ("Suite Junior", 2, 220m, 3),
            ("Suite Deluxe", 3, 320m, 2),
        };

        var roomTypes = new List<RoomType>(hotels.Count * 5);
        foreach (var h in hotels)
        {
            var count = rng.Next(4, 7);
            var picks = roomTypeNames.OrderBy(_ => rng.Next()).Take(count);
            foreach (var (name, cap, price, rooms) in picks)
            {
                var priceMultiplier = 1m + (h.Stars - 3) * 0.15m;
                roomTypes.Add(new RoomType
                {
                    Id = Guid.NewGuid(),
                    HotelId = h.Id,
                    Name = name,
                    Capacity = cap,
                    BasePrice = Math.Round(price * priceMultiplier, 2),
                    Description = $"Habitación {name.ToLower()} — acogedora y equipada.",
                    TotalRooms = rooms + rng.Next(0, 5)
                });
            }
        }

        logger.LogInformation("Inserting {Count} room types...", roomTypes.Count);
        await db.BulkInsertAsync(roomTypes);

        // Inventory — 45 days forward for each room type
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        const int INVENTORY_DAYS = 45;
        var inventory = new List<InventoryDay>(roomTypes.Count * INVENTORY_DAYS);
        foreach (var rt in roomTypes)
        {
            for (int d = 0; d < INVENTORY_DAYS; d++)
            {
                var date = today.AddDays(d);
                var dayVariation = 0.9m + (decimal)rng.NextDouble() * 0.4m; // 0.9 .. 1.3
                var weekendBoost = date.DayOfWeek is DayOfWeek.Friday or DayOfWeek.Saturday ? 1.2m : 1m;
                var avail = Math.Max(0, rt.TotalRooms - rng.Next(0, rt.TotalRooms + 1));
                inventory.Add(new InventoryDay
                {
                    Id = Guid.NewGuid(),
                    RoomTypeId = rt.Id,
                    Date = date,
                    AvailableRooms = avail,
                    Price = Math.Round(rt.BasePrice * dayVariation * weekendBoost, 2)
                });
            }
        }

        logger.LogInformation("Inserting {Count} inventory days (this is the biggest batch)...", inventory.Count);
        await db.BulkInsertAsync(inventory, batchSize: 5000);

        // Reservations (~500)
        var reservationFaker = new Faker("es");
        const int RESERVATION_COUNT = 500;
        var reservations = new List<Reservation>(RESERVATION_COUNT);
        var byHotel = roomTypes.GroupBy(r => r.HotelId).ToDictionary(g => g.Key, g => g.ToList());
        var hotelIds = hotels.Select(h => h.Id).ToArray();

        for (int i = 0; i < RESERVATION_COUNT; i++)
        {
            var hotelId = hotelIds[rng.Next(hotelIds.Length)];
            if (!byHotel.TryGetValue(hotelId, out var rts) || rts.Count == 0) continue;
            var rt = rts[rng.Next(rts.Count)];

            var offset = rng.Next(-15, 40);
            var checkIn = today.AddDays(offset);
            var nights = rng.Next(1, 7);
            var checkOut = checkIn.AddDays(nights);
            var rooms = rng.Next(1, 3);
            var total = rt.BasePrice * rooms * nights;

            ReservationStatus status = offset < -3 ? ReservationStatus.CheckedOut
                : offset < 0 ? (rng.NextDouble() < 0.7 ? ReservationStatus.CheckedIn : ReservationStatus.Confirmed)
                : rng.NextDouble() < 0.15 ? ReservationStatus.Pending
                : rng.NextDouble() < 0.08 ? ReservationStatus.Cancelled
                : ReservationStatus.Confirmed;

            reservations.Add(new Reservation
            {
                Id = Guid.NewGuid(),
                HotelId = hotelId,
                RoomTypeId = rt.Id,
                GuestName = reservationFaker.Name.FullName(),
                GuestEmail = reservationFaker.Internet.Email().ToLower(),
                CheckIn = checkIn,
                CheckOut = checkOut,
                Rooms = rooms,
                TotalPrice = total,
                Status = status,
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 30))
            });
        }

        logger.LogInformation("Inserting {Count} reservations...", reservations.Count);
        await db.BulkInsertAsync(reservations);

        logger.LogInformation("Seed completed: {Hotels} hoteles, {RoomTypes} tipos, {Inv} días, {Res} reservas.",
            hotels.Count, roomTypes.Count, inventory.Count, reservations.Count);
    }

    private static async Task SeedAdminAsync(UserManager<ApplicationUser> userManager, ILogger logger)
    {
        const string email = "admin@altairis.com";
        const string password = "Admin123!";

        var existing = await userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            logger.LogInformation("Admin user already exists.");
            return;
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Operador Altairis",
            EmailConfirmed = true
        };
        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            logger.LogInformation("Admin user created: {Email} / {Password}", email, password);
        else
            logger.LogError("Failed to create admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
    }
}

internal static class BulkInsertExtensions
{
    // Simple batched AddRange + SaveChanges. Not SqlBulkCopy-fast, but fine for ~180k rows in dev.
    public static async Task BulkInsertAsync<T>(this AltairisDbContext db, IEnumerable<T> entities, int batchSize = 1000)
        where T : class
    {
        var set = db.Set<T>();
        var batch = new List<T>(batchSize);
        foreach (var e in entities)
        {
            batch.Add(e);
            if (batch.Count >= batchSize)
            {
                set.AddRange(batch);
                await db.SaveChangesAsync();
                foreach (var entry in db.ChangeTracker.Entries().ToList())
                    entry.State = EntityState.Detached;
                batch.Clear();
            }
        }
        if (batch.Count > 0)
        {
            set.AddRange(batch);
            await db.SaveChangesAsync();
            foreach (var entry in db.ChangeTracker.Entries().ToList())
                entry.State = EntityState.Detached;
        }
    }
}

internal static class RandomExtensions
{
    public static int WeightedRandom(this Randomizer r, int[] values, float[] weights)
    {
        var total = weights.Sum();
        var pick = r.Float(0, total);
        float acc = 0;
        for (int i = 0; i < values.Length; i++)
        {
            acc += weights[i];
            if (pick <= acc) return values[i];
        }
        return values[^1];
    }
}
