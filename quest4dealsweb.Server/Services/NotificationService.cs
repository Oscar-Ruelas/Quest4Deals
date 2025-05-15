using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using quest4dealsweb.Server.notifications; // For your Program.SendEmail
using System.Threading.Tasks;
using EmailProgram = quest4dealsweb.Server.notifications.Program; // Create an alias


namespace quest4dealsweb.Server.Services
{
    public class NotificationService
    {
        private readonly DataContext _context;
        private readonly UserManager<User> _userManager; // For fetching User details
        private readonly ILogger<NotificationService> _logger;
        // private readonly IConfiguration _configuration; // Keep if needed for Smtp settings

        public NotificationService(DataContext context, UserManager<User> userManager, ILogger<NotificationService> logger/*, IConfiguration configuration*/)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
            // _configuration = configuration;
        }

        public async Task CheckAndSendPriceNotifications(int externalGameId, string gameTitle, decimal newPrice, string platformOfChange)
        {
            _logger.LogInformation($"Checking notifications for ExternalGameId: {externalGameId}, New Price: {newPrice} on Platform: {platformOfChange}");

            // Fetch watchlist entries. We don't include User here anymore.
            var watchlistEntries = await _context.Games
                .Where(g => g.ExternalGameId == externalGameId && g.GetNotified && g.Platform == platformOfChange)
                .ToListAsync(); // Removed .Include(g => g.User)

            if (!watchlistEntries.Any())
            {
                _logger.LogInformation($"No active watchlist entries found for ExternalGameId: {externalGameId} on Platform: {platformOfChange}");
                return;
            }

            foreach (var entry in watchlistEntries)
            {
                // Fetch the user for each entry to get their email
                var user = await _userManager.FindByIdAsync(entry.UserId);

                if (user == null || string.IsNullOrEmpty(user.Email))
                {
                    _logger.LogWarning($"Watchlist entry for GameId {entry.Id} (External: {entry.ExternalGameId}) is missing user or user email. UserId: {entry.UserId}");
                    continue;
                }

                bool shouldNotify = false;
                string reason = "";

                if (entry.NotificationType == "AnyChange")
                {
                    if (entry.Price != newPrice) // entry.Price is the last known price for this watchlist item
                    {
                        shouldNotify = true;
                        reason = $"the price changed from {entry.Price:C} to {newPrice:C}.";
                    }
                }
                else if (entry.NotificationType == "Threshold" && entry.PriceThreshold.HasValue)
                {
                    if (newPrice <= entry.PriceThreshold.Value)
                    {
                        if (entry.LastNotificationSentAt == null || (DateTime.UtcNow - entry.LastNotificationSentAt.Value).TotalDays > 1 || entry.Price != newPrice)
                        {
                            shouldNotify = true;
                            reason = $"it has reached your set threshold of {entry.PriceThreshold.Value:C} (current price: {newPrice:C}).";
                        }
                    }
                }

                if (shouldNotify)
                {
                    _logger.LogInformation($"Attempting to send notification to {user.Email} for game {entry.Title} ({entry.Platform}). Reason: {reason}");
                    string emailSubject = $"Quest4Deals: Price Update for {entry.Title}";
                    string emailBody;
                    if (entry.NotificationType == "Threshold" && entry.PriceThreshold.HasValue) // Check PriceThreshold again for safety
                    {
                        emailBody = $"<p>Hello {user.UserName ?? user.Name},</p>" + // Use user.Name if UserName is null
                                    $"<p>The price for <b>{entry.Title}</b> on <b>{entry.Platform}</b> has reached your set threshold of <b>{entry.PriceThreshold.Value:C}</b>!</p>" +
                                    $"<p>The current price is now <b>{newPrice:C}</b>.</p>" +
                                    $"<p>Happy deal hunting!</p>" +
                                    $"<p>The Quest4Deals Team</p>";
                    }
                    else // AnyChange or fallback
                    {
                        emailBody = $"<p>Hello {user.UserName ?? user.Name},</p>" +
                                    $"<p>There's a price update for <b>{entry.Title}</b> on <b>{entry.Platform}</b>.</p>" +
                                    $"<p>The price has changed from {entry.Price:C} to <b>{newPrice:C}</b>.</p>" +
                                    $"<p>Happy deal hunting!</p>" +
                                    $"<p>The Quest4Deals Team</p>";
                    }

                    try
                    {
                        // Assuming notifications.Program.SendEmailAsync is static and accessible
                        //await quest4dealsweb.Server.notifications.Program.SendEmailAsync(user.Email, emailSubject, emailBody);
                        await EmailProgram.SendEmailAsync(user.Email, emailSubject, emailBody);
                        _logger.LogInformation($"Notification email sent to {user.Email} for game {entry.Title}.");
                        entry.LastNotificationSentAt = DateTime.UtcNow;
                        // The entry.Price should be updated by the PriceHistoryService or whatever calls this.
                        // Here we only update LastNotificationSentAt for this specific watchlist entry.
                        _context.Games.Update(entry);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to send notification email to {user.Email} for game {entry.Title}.");
                    }
                }
            }
            await _context.SaveChangesAsync();
        }
    }
}