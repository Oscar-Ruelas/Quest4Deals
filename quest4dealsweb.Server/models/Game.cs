public class Game
{
    public int Id { get; set; }

    public int ExternalGameId { get; set; } // ✅ Unique identifier for the game

    public string Title { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool GetNotified { get; set; } = true;

    // New properties for notification preferences
    public string? NotificationType { get; set; } // e.g., "AnyChange", "Threshold"
    public decimal? PriceThreshold { get; set; } // Nullable if not a threshold type notification
    public DateTime? LastNotificationSentAt { get; set; } // To help prevent spamming

    public string UserId { get; set; } // ✅ Foreign Key (No navigation property)
}