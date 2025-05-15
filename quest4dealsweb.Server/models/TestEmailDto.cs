using System.ComponentModel.DataAnnotations;

namespace quest4dealsweb.Server.models
{
    public class TestEmailDto
    {
        [Required]
        [EmailAddress]
        public string RecipientEmail { get; set; } = string.Empty;

        [Required]
        public string UserName { get; set; } = "Valued User"; // Default if not provided

        [Required]
        public string GameTitle { get; set; } = string.Empty;

        [Required]
        public string Platform { get; set; } = string.Empty;

        [Required]
        public decimal NewPrice { get; set; }

        public decimal? OldPrice { get; set; } // Optional, for "AnyChange" type simulation

        // Notification type to simulate
        [Required]
        public string NotificationTypeToSimulate { get; set; } = "AnyChange"; // "AnyChange" or "Threshold"

        public decimal? PriceThreshold { get; set; } // Required if NotificationTypeToSimulate is "Threshold"
    }
}