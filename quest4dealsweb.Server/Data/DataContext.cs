using quest4dealsweb.Server.models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace quest4dealsweb.Server.Data;
public class DataContext : IdentityDbContext<User>
{
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    public DbSet<Game> Games { get; set; }
    public DbSet<GamePriceHistory> GamePriceHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Ensure Identity is configured properly

        // Ensure that Email is unique (already unique by default in Identity)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
        // Ensure that UserName is unique (replaces Username)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.UserName)
            .IsUnique();
        modelBuilder.Entity<Game>()
            .Property(g => g.Price)
            .HasPrecision(18, 2);
        // Configure GetNotified default value
        modelBuilder.Entity<Game>()
            .Property(g => g.GetNotified)
            .HasDefaultValue(true);

        // Configure new notification properties
        modelBuilder.Entity<Game>()
            .Property(g => g.NotificationType)
            .HasMaxLength(50) // Adjust size as needed
            .IsRequired(false); // Nullable

        modelBuilder.Entity<Game>()
            .Property(g => g.PriceThreshold)
            .HasPrecision(18, 2)
            .IsRequired(false); // Nullable

        modelBuilder.Entity<Game>()
            .Property(g => g.LastNotificationSentAt)
            .IsRequired(false); // Nullable


        // Add a composite index on ExternalGameId and UserId to ensure uniqueness
        // This should likely be ExternalGameId, UserId, AND Platform for true uniqueness of a watchlist item
        modelBuilder.Entity<Game>()
            .HasIndex(g => new { g.ExternalGameId, g.UserId, g.Platform }) // Added Platform
            .IsUnique();
        modelBuilder.Entity<Game>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        // Configure GamePriceHistory
        modelBuilder.Entity<GamePriceHistory>()
            .HasKey(ph => ph.Id);
        modelBuilder.Entity<GamePriceHistory>()
            .Property(ph => ph.Price) // Ensure precision for GamePriceHistory as well
            .HasPrecision(18, 2);
        modelBuilder.Entity<GamePriceHistory>()
            .HasOne<Game>() // Reference Game without navigation property
            .WithMany() // If Game had a collection of GamePriceHistory, it would go here.
            .HasForeignKey(ph => ph.GameId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}