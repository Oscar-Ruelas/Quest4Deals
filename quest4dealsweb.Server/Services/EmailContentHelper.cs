namespace quest4dealsweb.Server.Services // Or quest4dealsweb.Server.notifications
{
    public static class EmailContentHelper
    {
        public static string GenerateEmailBody(
            string userName,
            string gameTitle,
            string platform,
            decimal newPrice,
            string notificationType, // "Threshold" or "AnyChange"
            decimal? priceThreshold, // Required if notificationType is "Threshold"
            decimal? oldPrice,       // Optional: Price before the change
            bool isTestEmail = false // Flag to add "TEST" markers if ever needed again, but we'll default to false
        )
        {
            string intro;
            if (isTestEmail)
            {
                intro = $"<p>Hello {userName},</p><p>This is a <b>TEST</b> notification (simulating a real price alert).</p>";
            }
            else
            {
                intro = $"<p>Hello {userName},</p>";
            }

            // Common outro - logo will be appended by SendEmailAsync later
            string outro;
            if (isTestEmail)
            {
                outro = $"<p>Happy deal hunting!</p><p>The Quest4Deals Team (Test System)</p>";
            }
            else
            {
                outro = $"<p>Happy deal hunting!</p><p>The Quest4Deals Team</p>";
            }


            string emailBody;

            if (notificationType == "Threshold" && priceThreshold.HasValue)
            {
                string oldPriceInfo = oldPrice.HasValue ? $" (previously {oldPrice.Value:C})" : "";
                emailBody = intro +
                            $"<p>The price for <b>{gameTitle}</b> on <b>{platform}</b> has reached your set threshold of <b>{priceThreshold.Value:C}</b>!</p>" +
                            $"<p>The current price is now <b>{newPrice:C}</b>{oldPriceInfo}.</p>" +
                            outro;
            }
            else // AnyChange or fallback
            {
                string oldPriceDesc = oldPrice.HasValue ? $"{oldPrice.Value:C}" : "a previous price";
                emailBody = intro +
                            $"<p>There's a price update for <b>{gameTitle}</b> on <b>{platform}</b>.</p>" +
                            $"<p>The price has changed from {oldPriceDesc} to <b>{newPrice:C}</b>.</p>" +
                            outro;
            }
            return emailBody;
        }
    }
}