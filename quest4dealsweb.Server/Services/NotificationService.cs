using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using System;
using System.Linq;
using System.Threading.Tasks;
using EmailProgram = quest4dealsweb.Server.notifications.Program; // Alias

namespace quest4dealsweb.Server.Services
{
    public class NotificationService
    {
        private readonly DataContext _context;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            DataContext context,
            UserManager<User> userManager,
            ILogger<NotificationService> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        public async Task CheckAndSendPriceNotifications(int externalGameId, string gameTitle, decimal newPrice, string platformOfChange)
        {
            // ... (logging and fetching watchlistEntries remains the same) ...
            _logger.LogInformation($"Checking notifications for ExternalGameId: {externalGameId}, New Price: {newPrice} on Platform: {platformOfChange}");

            var watchlistEntries = await _context.Games
                .Where(g => g.ExternalGameId == externalGameId && g.GetNotified && g.Platform == platformOfChange)
                .ToListAsync();

            if (!watchlistEntries.Any())
            {
                _logger.LogInformation($"No active watchlist entries found for ExternalGameId: {externalGameId} on Platform: {platformOfChange}");
                return;
            }

            foreach (var entry in watchlistEntries)
            {
                var user = await _userManager.FindByIdAsync(entry.UserId);
                if (user == null || string.IsNullOrEmpty(user.Email))
                {
                    _logger.LogWarning($"Watchlist entry for GameId {entry.Id} (External: {entry.ExternalGameId}) is missing user or user email. UserId: {entry.UserId}");
                    continue;
                }

                bool shouldNotify = false;
                decimal? priceBeforeChange = entry.Price;

                if (entry.NotificationType == "AnyChange")
                {
                    if (priceBeforeChange != newPrice)
                    {
                        shouldNotify = true;
                    }
                }
                else if (entry.NotificationType == "Threshold" && entry.PriceThreshold.HasValue)
                {
                    if (newPrice <= entry.PriceThreshold.Value)
                    {
                        if (entry.LastNotificationSentAt == null || (DateTime.UtcNow - entry.LastNotificationSentAt.Value).TotalDays > 1 || priceBeforeChange != newPrice)
                        {
                            shouldNotify = true;
                        }
                    }
                }

                if (shouldNotify)
                {
                    _logger.LogInformation($"Attempting to send notification to {user.Email} for game {entry.Title} ({entry.Platform}).");
                    string emailSubject = $"Quest4Deals: Price Update for {entry.Title}";

                    // Use the shared helper to generate the email body
                    string emailBody = EmailContentHelper.GenerateEmailBody(
                        userName: user.UserName ?? user.Name, // Pass user's name
                        gameTitle: entry.Title,
                        platform: entry.Platform,
                        newPrice: newPrice,
                        notificationType: entry.NotificationType ?? "AnyChange", // Default to AnyChange if null
                        priceThreshold: entry.PriceThreshold,
                        oldPrice: priceBeforeChange,
                        isTestEmail: false // This is a live email
                    );

                    try
                    {
                        await EmailProgram.SendEmailAsync(user.Email, emailSubject, emailBody);
                        _logger.LogInformation($"Notification email sent to {user.Email} for game {entry.Title}.");
                        entry.LastNotificationSentAt = DateTime.UtcNow;
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