using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WatchlistController : ControllerBase
{
    private readonly DataContext _context;
    private readonly UserManager<User> _userManager;

    public WatchlistController(
        DataContext context,
        UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // Check if game is in watchlist
    [HttpGet("check/{id}")]
    public async Task<IActionResult> CheckWatchlist(int id)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var game = await _context.Games
            .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id);

        return Ok(new { 
            isWatchlisted = game != null,
            getNotified = game?.GetNotified ?? true,
            genre = game?.Genre ?? string.Empty
        });
    }

    // Add to watchlist
    [HttpPost("add/{id}")]
    public async Task<IActionResult> AddToWatchlist(int id, [FromBody] WatchlistGameDto gameDto)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Check if game already exists in watchlist
            var existingGame = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id);

            if (existingGame != null)
            {
                return BadRequest(new { message = "Game already in watchlist" });
            }

            var game = new Game
            {
                ExternalGameId = id,
                Title = gameDto.GameTitle,
                Platform = gameDto.Platform,
                Price = gameDto.CurrentPrice,
                Genre = gameDto.Genre,
                UserId = user.Id,
                GetNotified = gameDto.GetNotified
            };

            _context.Games.Add(game);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Game added to watchlist" });
        }
        catch (Exception ex)
        {
            // Log the exception
            return StatusCode(500, new { message = "Failed to add game to watchlist" });
        }
    }

    // Update notification setting
    [HttpPut("notify/{id}")]
    public async Task<IActionResult> UpdateNotificationSetting(int id, [FromBody] bool getNotified)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id);

            if (game == null)
            {
                return NotFound(new { message = "Game not found in watchlist" });
            }

            game.GetNotified = getNotified;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification setting updated" });
        }
        catch (Exception ex)
        {
            // Log the exception
            return StatusCode(500, new { message = "Failed to update notification setting" });
        }
    }

    // Remove from watchlist
    [HttpPost("remove/{id}")]
    public async Task<IActionResult> RemoveFromWatchlist(int id)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id);

            if (game == null)
            {
                return NotFound(new { message = "Game not found in watchlist" });
            }

            _context.Games.Remove(game);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Game removed from watchlist" });
        }
        catch (Exception ex)
        {
            // Log the exception
            return StatusCode(500, new { message = "Failed to remove game from watchlist" });
        }
    }

    // Get user's watchlist
    [HttpGet]
    public async Task<IActionResult> GetWatchlist()
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var watchlist = await _context.Games
                .Where(g => g.UserId == user.Id)
                .Select(g => new
                {
                    g.ExternalGameId,
                    g.Title,
                    g.Platform,
                    g.Price,
                    g.Genre,
                    g.GetNotified
                })
                .ToListAsync();

            return Ok(watchlist);
        }
        catch (Exception ex)
        {
            // Log the exception
            return StatusCode(500, new { message = "Failed to retrieve watchlist" });
        }
    }
}

public class WatchlistGameDto
{
    public string GameTitle { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public string Genre { get; set; } = string.Empty;
    public bool GetNotified { get; set; } = true;
}