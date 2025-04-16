using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models; // Note: lowercase "models" instead of "Models"
using System;
using System.Linq;
using System.Threading.Tasks;

namespace quest4dealsweb.Server.Services
{
    public class PriceHistoryService
    {
        private readonly DataContext _context;

        public PriceHistoryService(DataContext context)
        {
            _context = context;
        }

        public async Task<bool> CheckAndUpdatePriceHistory(int gameId, decimal currentPrice)
        {
            // Get the latest price record for the game
            var latestPrice = await _context.GamePriceHistories
                .Where(ph => ph.GameId == gameId)
                .OrderByDescending(ph => ph.RecordedAt)
                .FirstOrDefaultAsync();

            // Check if price has changed or if this is the first price record
            if (latestPrice == null || latestPrice.Price != currentPrice)
            {
                // Add new price record
                var newPriceHistory = new GamePriceHistory
                {
                    GameId = gameId,
                    Price = currentPrice,
                    RecordedAt = DateTime.UtcNow
                };

                _context.GamePriceHistories.Add(newPriceHistory);
                await _context.SaveChangesAsync();
                return true; // Price was updated
            }

            return false; // No price change
        }
    }
}