using Microsoft.EntityFrameworkCore;
using CodeGuardAI.WebAPI.Models;
using System.Security.Cryptography;
using System.Text;

namespace CodeGuardAI.WebAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Vulnerability> Vulnerabilities { get; set; }
    public DbSet<PullRequest> PullRequests { get; set; }
    public DbSet<Leaderboard> Leaderboards { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Add indices for Vulnerability table to optimize dashboard queries
        modelBuilder.Entity<Vulnerability>()
            .HasIndex(v => v.Status);
        modelBuilder.Entity<Vulnerability>()
            .HasIndex(v => v.Severity);
        modelBuilder.Entity<Vulnerability>()
            .HasIndex(v => v.CreatedAt);

        // Seed Leaderboard Users
        modelBuilder.Entity<Leaderboard>().HasData(
            new Leaderboard { Id = 1, Name = "Sarah Connor", Avatar = "https://api.dicebear.com/7.x/bottts/svg?seed=Sarah", Score = 1450, Rank = 1 },
            new Leaderboard { Id = 2, Name = "John Doe", Avatar = "https://api.dicebear.com/7.x/bottts/svg?seed=John", Score = 1200, Rank = 2 },
            new Leaderboard { Id = 3, Name = "Neo", Avatar = "https://api.dicebear.com/7.x/bottts/svg?seed=Neo", Score = 950, Rank = 3 },
            new Leaderboard { Id = 4, Name = "Trinity", Avatar = "https://api.dicebear.com/7.x/bottts/svg?seed=Trinity", Score = 800, Rank = 4 }
        );

        // Seed an Admin User
        // password is "admin123"
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes("admin123"));
        var passwordHash = Convert.ToBase64String(hashedBytes);

        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Username = "admin", PasswordHash = passwordHash, Role = "Administrator" }
        );
    }
}
