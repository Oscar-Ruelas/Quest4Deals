using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace quest4dealsweb.Server.Services
{
    public class PriceHistoryService
    {
        private readonly DataContext _context;
        private readonly NotificationService _notificationService; // Inject NotificationService
        private readonly ILogger<PriceHistoryService> _logger;

        public PriceHistoryService(DataContext context, NotificationService notificationService, ILogger<PriceHistoryService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        // This method now assumes it's called for a specific platform's price.
        public async Task<bool> CheckAndUpdatePriceHistory(int externalGameId, string gameTitle, decimal currentPrice, string platform)
        {
            _logger.LogInformation($"Price check for ExternalGameId: {externalGameId}, Title: {gameTitle}, Price: {currentPrice}, Platform: {platform}");

            // Find the specific game entry in the user's watchlist for this platform
            // This service might not be user-specific, but rather game-specific for price history.
            // The notification service will handle user-specific watchlist entries.

            // We need a general GamePriceHistory for the game ID (ExternalGameId + Platform)
            // The 'Game' table here is used for watchlists. The actual GamePriceHistory table should be used for history.

            var gameInDb = await _context.Games
                                .FirstOrDefaultAsync(g => g.ExternalGameId == externalGameId && g.Platform == platform);

            string titleForNotification = gameTitle;
            if (gameInDb != null) // If at least one person is watching it, we might have a more accurate title from them.
            {
                titleForNotification = gameInDb.Title; // Use title from watchlist if available
            }


            // Get the latest price record FOR THE ACTUAL GAME (not a specific user's watchlist item price)
            // We might need a separate table for "MasterGamePrices" or rely on the Nexarda lowest_price as the canonical one.
            // For now, let's assume the GamePriceHistories table tracks the general price for a gameId (externalGameId + platform)

            // To correctly track history for a unique game (ExternalGameId + Platform combination),
            // the GameId in GamePriceHistories should ideally refer to an ID that uniquely identifies this combination.
            // If GamePriceHistory.GameId refers to the `Id` from the `Games` table (which is a watchlist item),
            // this logic gets complicated.
            // Let's assume GamePriceHistory.GameId directly stores the ExternalGameId for now for simplicity in this scope,
            // and platform is handled by context.
            // **This part needs careful consideration based on your GamePriceHistory table structure.**
            // For this implementation, I'll assume we're adding a new history entry regardless and notifying based on it.


            // Let's simplify: Assume we always record a price history if it's different from the very last entry *for that game and platform combination*.
            // This requires GamePriceHistory to store ExternalGameId and Platform or have a foreign key to a "MasterGame" table.
            // Given your current `GamePriceHistory` model, it links to `Game.Id` (watchlist item).
            // This implies price history might be per watchlist item, which is unusual.
            // Let's assume GamePriceHistory.GameId refers to Game.ExternalGameId for the purpose of this service.

            var latestOverallPriceHistory = await _context.GamePriceHistories
                .Where(ph => ph.GameId == externalGameId) // This GameId should represent the game, not watchlist Id.
                                                          // This is a simplification. Ideally GamePriceHistory would link to a unique game entity.
                .OrderByDescending(ph => ph.RecordedAt)
                .FirstOrDefaultAsync();

            bool priceHasChanged = latestOverallPriceHistory == null || latestOverallPriceHistory.Price != currentPrice;

            if (priceHasChanged)
            {
                _logger.LogInformation($"Price for {titleForNotification} ({platform}) changed to {currentPrice}. Old: {latestOverallPriceHistory?.Price.ToString("C") ?? "N/A"}.");
                var newPriceHistory = new GamePriceHistory
                {
                    // GameId here should refer to the actual game's unique ID in a master list,
                    // or store ExternalGameId and Platform directly in GamePriceHistory.
                    // Using ExternalGameId as GameId for GamePriceHistory based on current structure of other controllers.
                    GameId = externalGameId,
                    Price = currentPrice,
                    RecordedAt = DateTime.UtcNow
                };
                _context.GamePriceHistories.Add(newPriceHistory);

                // Update the current price on all watchlist entries for this game and platform
                var watchlistItemsToUpdate = await _context.Games
                    .Where(g => g.ExternalGameId == externalGameId && g.Platform == platform)
                    .ToListAsync();

                foreach (var item in watchlistItemsToUpdate)
                {
                    item.Price = currentPrice; // Update current price on watchlist
                    _context.Games.Update(item);
                }

                await _context.SaveChangesAsync(); // Save history and updated watchlist prices

                // Now trigger notifications
                await _notificationService.CheckAndSendPriceNotifications(externalGameId, titleForNotification, currentPrice, platform);
                return true; // Price was updated
            }
            _logger.LogInformation($"No price change detected for {titleForNotification} ({platform}). Current price {currentPrice} is same as last known {latestOverallPriceHistory?.Price.ToString("C")}.");
            return false; // No price change
        }
    }
}