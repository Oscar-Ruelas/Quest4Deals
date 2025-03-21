using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace quest4dealsweb.Server.Controllers;

[ApiController]
[Route("api/trends")]
public class GamePriceTrendsController : ControllerBase
{
    private readonly DataContext _context;

    public GamePriceTrendsController(DataContext context)
    {
        _context = context;
    }

    // GET: api/trends/game/{gameId}
    [HttpGet("game/{gameId}")]
    public async Task<ActionResult<GamePriceTrendDto>> GetGamePriceTrend(int gameId)
    {
        var game = await _context.Games.FindAsync(gameId);
        if (game == null)
        {
            return NotFound("Game not found.");
        }

        var priceHistory = await _context.GamePriceHistories
            .Where(ph => ph.GameId == gameId)
            .OrderBy(ph => ph.RecordedAt)
            .ToListAsync();

        if (!priceHistory.Any())
        {
            return NotFound("No price history found for this game.");
        }

        var initialPrice = priceHistory.First().Price;
        var currentPrice = priceHistory.Last().Price;
        var priceChangePercentage = initialPrice > 0
            ? Math.Round(((currentPrice - initialPrice) / initialPrice) * 100, 2)
            : 0;

        var trend = new GamePriceTrendDto
        {
            GameId = game.Id,
            Title = game.Title,
            Genre = game.Genre,
            Platform = game.Platform,
            CurrentPrice = currentPrice,
            InitialPrice = initialPrice,
            LowestPrice = priceHistory.Min(ph => ph.Price),
            HighestPrice = priceHistory.Max(ph => ph.Price),
            PriceChangePercentage = priceChangePercentage,
            LastUpdated = priceHistory.Last().RecordedAt,
            TotalPriceChanges = priceHistory.Count,
            PricePoints = priceHistory.Select(ph => new PricePoint
            {
                Date = ph.RecordedAt,
                Price = ph.Price
            }).ToList()
        };

        return Ok(trend);
    }

    // GET: api/trends/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<GamePriceTrendDto>>> GetUserGamePriceTrends(string userId)
    {
        var userGames = await _context.Games
            .Where(g => g.UserId == userId)
            .ToListAsync();

        if (!userGames.Any())
        {
            return NotFound("No games found for this user.");
        }

        var gameIds = userGames.Select(g => g.Id).ToList();

        var allPriceHistories = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .ToListAsync();

        var trends = new List<GamePriceTrendDto>();

        foreach (var game in userGames)
        {
            var gameHistory = allPriceHistories
                .Where(ph => ph.GameId == game.Id)
                .OrderBy(ph => ph.RecordedAt)
                .ToList();

            if (!gameHistory.Any())
                continue;

            var initialPrice = gameHistory.First().Price;
            var currentPrice = gameHistory.Last().Price;
            var priceChangePercentage = initialPrice > 0
                ? Math.Round(((currentPrice - initialPrice) / initialPrice) * 100, 2)
                : 0;

            trends.Add(new GamePriceTrendDto
            {
                GameId = game.Id,
                Title = game.Title,
                Genre = game.Genre,
                Platform = game.Platform,
                CurrentPrice = currentPrice,
                InitialPrice = initialPrice,
                LowestPrice = gameHistory.Min(ph => ph.Price),
                HighestPrice = gameHistory.Max(ph => ph.Price),
                PriceChangePercentage = priceChangePercentage,
                LastUpdated = gameHistory.Last().RecordedAt,
                TotalPriceChanges = gameHistory.Count,
                PricePoints = gameHistory.Select(ph => new PricePoint
                {
                    Date = ph.RecordedAt,
                    Price = ph.Price
                }).ToList()
            });
        }

        return Ok(trends);
    }

    // GET: api/trends/platform/{platform}
    [HttpGet("platform/{platform}")]
    public async Task<ActionResult<object>> GetPlatformPriceTrends(string platform)
    {
        var platformGames = await _context.Games
            .Where(g => g.Platform.ToLower() == platform.ToLower())
            .ToListAsync();

        if (!platformGames.Any())
        {
            return NotFound($"No games found for platform: {platform}");
        }

        var gameIds = platformGames.Select(g => g.Id).ToList();

        // Get the first and last price for each game
        var firstPrices = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .GroupBy(ph => ph.GameId)
            .Select(g => new
            {
                GameId = g.Key,
                FirstPrice = g.OrderBy(ph => ph.RecordedAt).First().Price
            })
            .ToListAsync();

        var lastPrices = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .GroupBy(ph => ph.GameId)
            .Select(g => new
            {
                GameId = g.Key,
                LastPrice = g.OrderByDescending(ph => ph.RecordedAt).First().Price
            })
            .ToListAsync();

        // Calculate platform averages
        var averageInitialPrice = firstPrices.Average(g => g.FirstPrice);
        var averageCurrentPrice = lastPrices.Average(g => g.LastPrice);
        var averagePriceChange = averageInitialPrice > 0
            ? ((averageCurrentPrice - averageInitialPrice) / averageInitialPrice) * 100
            : 0;

        // Get games with biggest price drops
        var priceChanges = firstPrices.Join(
            lastPrices,
            f => f.GameId,
            l => l.GameId,
            (f, l) => new
            {
                GameId = f.GameId,
                InitialPrice = f.FirstPrice,
                CurrentPrice = l.LastPrice,
                PriceChange = f.FirstPrice > 0
                    ? ((l.LastPrice - f.FirstPrice) / f.FirstPrice) * 100
                    : 0
            })
            .ToList();

        var biggestDrops = priceChanges
            .Where(pc => pc.PriceChange < 0)
            .OrderBy(pc => pc.PriceChange)
            .Take(5)
            .Join(
                platformGames,
                pc => pc.GameId,
                g => g.Id,
                (pc, g) => new
                {
                    GameId = g.Id,
                    Title = g.Title,
                    InitialPrice = pc.InitialPrice,
                    CurrentPrice = pc.CurrentPrice,
                    PriceChangePercent = Math.Round(pc.PriceChange, 2)
                }
            )
            .ToList();

        var biggestIncreases = priceChanges
            .Where(pc => pc.PriceChange > 0)
            .OrderByDescending(pc => pc.PriceChange)
            .Take(5)
            .Join(
                platformGames,
                pc => pc.GameId,
                g => g.Id,
                (pc, g) => new
                {
                    GameId = g.Id,
                    Title = g.Title,
                    InitialPrice = pc.InitialPrice,
                    CurrentPrice = pc.CurrentPrice,
                    PriceChangePercent = Math.Round(pc.PriceChange, 2)
                }
            )
            .ToList();

        return Ok(new
        {
            Platform = platform,
            GameCount = platformGames.Count,
            AverageInitialPrice = Math.Round(averageInitialPrice, 2),
            AverageCurrentPrice = Math.Round(averageCurrentPrice, 2),
            AveragePriceChangePercent = Math.Round(averagePriceChange, 2),
            BiggestPriceDrops = biggestDrops,
            BiggestPriceIncreases = biggestIncreases
        });
    }

    // GET: api/trends/genre/{genre}
    [HttpGet("genre/{genre}")]
    public async Task<ActionResult<object>> GetGenrePriceTrends(string genre)
    {
        // Similar logic to the platform endpoint, but filtered by genre instead
        var genreGames = await _context.Games
            .Where(g => g.Genre.ToLower() == genre.ToLower())
            .ToListAsync();

        if (!genreGames.Any())
        {
            return NotFound($"No games found for genre: {genre}");
        }

        // Rest of implementation similar to platform trends...
        var gameIds = genreGames.Select(g => g.Id).ToList();

        // Get price histories
        var priceHistories = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .ToListAsync();

        // Group by game
        var groupedHistories = priceHistories
            .GroupBy(ph => ph.GameId)
            .ToList();

        // Calculate average prices over time by month
        var pricesByMonth = priceHistories
            .GroupBy(ph => new { Month = ph.RecordedAt.Month, Year = ph.RecordedAt.Year })
            .Select(g => new
            {
                Date = new DateTime(g.Key.Year, g.Key.Month, 1),
                AveragePrice = g.Average(ph => ph.Price)
            })
            .OrderBy(x => x.Date)
            .ToList();

        return Ok(new
        {
            Genre = genre,
            GameCount = genreGames.Count,
            CurrentAveragePrice = Math.Round(genreGames.Average(g => g.Price), 2),
            PriceHistory = pricesByMonth
        });
    }
}