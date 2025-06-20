using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Controllers;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

[ApiController]
[Route("api/games")]
public class GameController : ControllerBase
{
    private readonly DataContext _context;

    public GameController(DataContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Game>>> GetAllGames()
    {
        return await _context.Games.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Game>> GetGame(int id)
    {
        var game = await _context.Games.FindAsync(id);
        if (game == null)
        {
            return NotFound("Game not found.");
        }

        var latestPriceHistory = await _context.GamePriceHistories
            .Where(ph => ph.GameId == id)
            .OrderByDescending(ph => ph.RecordedAt)
            .FirstOrDefaultAsync();

        if (latestPriceHistory != null && game.Price != latestPriceHistory.Price)
        {
            game.Price = latestPriceHistory.Price;
            _context.Entry(game).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        // Return a custom object without UserId
        return Ok(new
        {
            Id = game.Id,
            Title = game.Title,
            Genre = game.Genre,
            Platform = game.Platform,
            Price = game.Price
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetUserGamesPriceHistory(string userId)
    {
        // Get all games for this user
        var userGames = await _context.Games
            .Where(g => g.UserId == userId)
            .ToListAsync();

        if (userGames == null || !userGames.Any())
        {
            return NotFound("No games found for this user.");
        }

        // Get all price histories for these games
        var gameIds = userGames.Select(g => g.Id).ToList();
        var priceHistories = await _context.GamePriceHistories
            .Where(ph => gameIds.Contains(ph.GameId))
            .OrderByDescending(ph => ph.RecordedAt)
            .ToListAsync();

        // Group games by Title, Genre, and Platform, and use the first GameId as the representative
        var result = userGames
            .GroupBy(g => new { g.Title, g.Genre, g.Platform })
            .Select(group => new
            {
                Game = new
                {
                    Id = group.OrderBy(g => g.Id).First().Id, // Use the earliest GameId (e.g., 9 for DESTINY 9)
                    Title = group.Key.Title,
                    Genre = group.Key.Genre,
                    Platform = group.Key.Platform,
                    Price = group.OrderByDescending(g => g.Id).First().Price // Use the latest Price
                },
                PriceHistory = priceHistories
                    .Where(ph => group.Select(g => g.Id).Contains(ph.GameId))
                    .OrderByDescending(ph => ph.RecordedAt)
                    .Select(ph => new
                    {
                        Id = ph.Id,
                        GameId = group.OrderBy(g => g.Id).First().Id, // Rewrite GameId to match the chosen GameId
                        Price = ph.Price,
                        RecordedAt = ph.RecordedAt
                    })
                    .ToList()
            });

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Game>> CreateGame(Game game)
    {
        // Check if the User exists before adding the game
        var userExists = await _context.Users.AnyAsync(u => u.Id == game.UserId);
        if (!userExists)
        {
            return BadRequest("User not found.");
        }

        // Add the game
        _context.Games.Add(game);
        await _context.SaveChangesAsync();

        // Record initial price history
        var priceHistory = new GamePriceHistory
        {
            GameId = game.Id,
            Price = game.Price,
            RecordedAt = DateTime.UtcNow
        };

        _context.GamePriceHistories.Add(priceHistory);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGame), new { id = game.Id }, game);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGame(int id, Game game)
    {
        if (id != game.Id)
        {
            return BadRequest("Game ID mismatch.");
        }

        // Get the existing game to check if price changed
        var existingGame = await _context.Games.FindAsync(id);
        if (existingGame == null)
        {
            return NotFound("Game not found.");
        }

        bool priceChanged = existingGame.Price != game.Price;

        // Update the game
        _context.Entry(existingGame).State = EntityState.Detached;
        _context.Entry(game).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();

            // If price changed, record a new price history entry
            if (priceChanged)
            {
                var priceHistory = new GamePriceHistory
                {
                    GameId = game.Id,
                    Price = game.Price,
                    RecordedAt = DateTime.UtcNow
                };

                _context.GamePriceHistories.Add(priceHistory);
                await _context.SaveChangesAsync();
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            bool exists = _context.Games.Any(e => e.Id == id);
            if (!exists)
            {
                return NotFound("Game not found.");
            }
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGame(int id)
    {
        var game = await _context.Games.FindAsync(id);
        if (game == null)
        {
            return NotFound("Game not found.");
        }

        _context.Games.Remove(game);
        await _context.SaveChangesAsync();

        // Note: Price history will be automatically deleted due to cascade delete

        return NoContent();
    }
}