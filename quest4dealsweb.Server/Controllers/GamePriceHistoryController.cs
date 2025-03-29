using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace quest4dealsweb.Server.Controllers;

[ApiController]
[Route("api/price-history")]
public class GamePriceHistoryController : ControllerBase
{
    private readonly DataContext _context;

    public GamePriceHistoryController(DataContext context)
    {
        _context = context;
    }

    // GET: api/price-history/game/{gameId}
    [HttpGet("game/{gameId}")]
    public async Task<ActionResult<IEnumerable<GamePriceHistory>>> GetGamePriceHistory(int gameId)
    {
        var game = await _context.Games.FindAsync(gameId);
        if (game == null)
        {
            return NotFound("Game not found.");
        }

        var priceHistory = await _context.GamePriceHistories
            .Where(ph => ph.GameId == gameId) // Simplified to single GameId
            .OrderByDescending(ph => ph.RecordedAt)
            .ToListAsync();

        if (priceHistory == null || !priceHistory.Any())
        {
            return NotFound("No price history found for this game.");
        }

        return Ok(priceHistory);
    }

    // GET: api/price-history/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetUserGamesPriceHistory(string userId)
    {
        var userGames = await _context.Games
            .Where(g => g.UserId == userId)
            .ToListAsync();

        if (userGames == null || !userGames.Any())
        {
            return NotFound("No games found for this user.");
        }

        var gameIds = userGames.Select(g => g.Id).ToList();
        var priceHistories = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .OrderByDescending(ph => ph.RecordedAt)
            .ToListAsync();

        var result = userGames
            .GroupBy(g => new { g.Title, g.Genre, g.Platform })
            .Select(group =>
            {
                var groupGameIds = group.Select(g => g.Id).ToList();
                var latestPrice = priceHistories
                    .Where(ph => groupGameIds.Contains(ph.GameId))
                    .OrderByDescending(ph => ph.RecordedAt)
                    .FirstOrDefault()?.Price ?? group.First().Price;

                return new
                {
                    Game = new
                    {
                        Id = group.OrderBy(g => g.Id).First().Id,
                        Title = group.Key.Title,
                        Genre = group.Key.Genre,
                        Platform = group.Key.Platform,
                        Price = latestPrice,
                        UserId = group.First().UserId
                    },
                    PriceHistory = priceHistories
                        .Where(ph => groupGameIds.Contains(ph.GameId))
                        .OrderByDescending(ph => ph.RecordedAt)
                        .Select(ph => new
                        {
                            Id = ph.Id,
                            GameId = group.OrderBy(g => g.Id).First().Id,
                            Price = ph.Price,
                            RecordedAt = ph.RecordedAt
                        })
                        .ToList()
                };
            });

        return Ok(result);
    }

    // POST: api/price-history
    [HttpPost]
    public async Task<ActionResult<GamePriceHistory>> RecordPriceChange([FromBody] GamePriceHistoryDto priceHistoryDto)
    {
        var game = await _context.Games.FindAsync(priceHistoryDto.GameId);
        if (game == null)
        {
            return BadRequest("Game not found.");
        }

        var priceHistory = new GamePriceHistory
        {
            GameId = priceHistoryDto.GameId,
            Price = priceHistoryDto.Price,
            RecordedAt = DateTime.UtcNow
        };

        _context.GamePriceHistories.Add(priceHistory);
        game.Price = priceHistoryDto.Price;
        _context.Entry(game).State = EntityState.Modified;

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGamePriceHistory), new { gameId = priceHistory.GameId }, priceHistory);
    }

    // GET: api/price-history/latest/{gameId}
    [HttpGet("latest/{gameId}")]
    public async Task<ActionResult<GamePriceHistory>> GetLatestPrice(int gameId)
    {
        var latestPrice = await _context.GamePriceHistories
            .Where(ph => ph.GameId == gameId)
            .OrderByDescending(ph => ph.RecordedAt)
            .FirstOrDefaultAsync();

        if (latestPrice == null)
        {
            return NotFound("No price history found for this game.");
        }

        return Ok(latestPrice);
    }

    // GET: api/price-history/stats/{gameId}
    [HttpGet("stats/{gameId}")]
    public async Task<ActionResult<object>> GetPriceStats(int gameId)
    {
        var priceHistory = await _context.GamePriceHistories
            .Where(ph => ph.GameId == gameId)
            .OrderBy(ph => ph.RecordedAt)
            .ToListAsync();

        if (priceHistory == null || !priceHistory.Any())
        {
            return NotFound("No price history found for this game.");
        }

        var stats = new
        {
            GameId = gameId,
            InitialPrice = priceHistory.First().Price,
            CurrentPrice = priceHistory.Last().Price,
            LowestPrice = priceHistory.Min(ph => ph.Price),
            HighestPrice = priceHistory.Max(ph => ph.Price),
            AveragePrice = priceHistory.Average(ph => ph.Price),
            PriceChanges = priceHistory.Count(),
            PriceHistory = priceHistory
        };

        return Ok(stats);
    }
}
