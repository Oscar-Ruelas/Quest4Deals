using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace quest4dealsweb.Server.models;

public class GamePriceHistory
{
    public int Id { get; set; }

    [Required]
    public int GameId { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    [Required]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Navigation property (optional)
    public Game Game { get; set; }
}