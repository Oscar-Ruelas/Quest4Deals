using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace quest4dealsweb.Server.Controllers
{
    [ApiController]
    [Route("api/price-history")]
    public class PriceHistoryController : ControllerBase
    {
        private readonly DataContext _context;

        public PriceHistoryController(DataContext context)
        {
            _context = context;
        }

        [HttpGet("stats/{gameId}")]
        public async Task<IActionResult> GetPriceHistoryStats(int gameId)
        {
            try
            {
                // Check if the game exists
                var game = await _context.Games.FindAsync(gameId);
                if (game == null)
                {
                    return NotFound($"Game with ID {gameId} not found");
                }

                // Get price history sorted by date
                var priceHistory = await _context.GamePriceHistories
                    .Where(ph => ph.GameId == gameId)
                    .OrderBy(ph => ph.RecordedAt)
                    .Select(ph => new
                    {
                        ph.Id,
                        ph.GameId,
                        ph.Price,
                        ph.RecordedAt
                    })
                    .ToListAsync();

                // Calculate stats if there is history data
                var stats = new
                {
                    CurrentPrice = game.Price,
                    LowestPrice = priceHistory.Any() ? priceHistory.Min(ph => ph.Price) : game.Price,
                    HighestPrice = priceHistory.Any() ? priceHistory.Max(ph => ph.Price) : game.Price,
                    AveragePrice = priceHistory.Any() ? priceHistory.Average(ph => ph.Price) : game.Price,
                    PriceChangesCount = priceHistory.Count,
                    LatestChange = priceHistory.OrderByDescending(ph => ph.RecordedAt).FirstOrDefault()
                };

                return Ok(new
                {
                    GameId = gameId,
                    GameTitle = game.Title,
                    PriceHistory = priceHistory,
                    Stats = stats
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("chart/{gameId}")]
        public async Task<IActionResult> GetPriceHistoryChartData(int gameId)
        {
            try
            {
                // Check if the game exists
                var game = await _context.Games.FindAsync(gameId);
                if (game == null)
                {
                    return NotFound($"Game with ID {gameId} not found");
                }

                // Get simplified price history for chart rendering
                var priceHistory = await _context.GamePriceHistories
                    .Where(ph => ph.GameId == gameId)
                    .OrderBy(ph => ph.RecordedAt)
                    .Select(ph => new
                    {
                        Date = ph.RecordedAt.ToString("yyyy-MM-dd"),
                        Price = ph.Price
                    })
                    .ToListAsync();

                return Ok(new
                {
                    Labels = priceHistory.Select(p => p.Date).ToArray(),
                    Prices = priceHistory.Select(p => p.Price).ToArray()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
