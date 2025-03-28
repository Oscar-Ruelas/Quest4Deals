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
        var priceHistory = await _context.GamePriceHistories
            .Where(ph => ph.GameId == gameId)
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
        // First get all games for this user
        var userGames = await _context.Games
            .Where(g => g.UserId == userId)
            .ToListAsync();

        if (userGames == null || !userGames.Any())
        {
            return NotFound("No games found for this user.");
        }

        // Get the list of game IDs
        var gameIds = userGames.Select(g => g.Id).ToList();

        // Get price history for all these games
        var priceHistories = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .OrderByDescending(ph => ph.RecordedAt)
            .ToListAsync();

        // Group by game
        var result = userGames.Select(game => new
        {
            Game = game,
            PriceHistory = priceHistories
                .Where(ph => ph.GameId == game.Id)
                .OrderByDescending(ph => ph.RecordedAt)
                .ToList()
        });

        return Ok(result);
    }

    // POST: api/price-history
    [HttpPost]
    public async Task<ActionResult<GamePriceHistory>> RecordPriceChange(GamePriceHistory priceHistory)
    {
        // Validate that the game exists
        var gameExists = await _context.Games.AnyAsync(g => g.Id == priceHistory.GameId);
        if (!gameExists)
        {
            return BadRequest("Game not found.");
        }

        // Set the recorded time to current UTC time
        priceHistory.RecordedAt = DateTime.UtcNow;

        _context.GamePriceHistories.Add(priceHistory);
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