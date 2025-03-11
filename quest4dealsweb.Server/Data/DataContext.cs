using quest4dealsweb.Server.models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace quest4dealsweb.Server.Data;

public class DataContext : IdentityDbContext<User>
{
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    public DbSet<Game> Games { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Ensure Identity is configured properly

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

        modelBuilder.Entity<Game>()
            .HasOne<User>() 
            .WithMany()    
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade); 
    }
}