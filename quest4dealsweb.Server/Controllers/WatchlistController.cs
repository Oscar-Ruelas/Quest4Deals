using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Require authentication for all endpoints
public class WatchlistController : ControllerBase
{
    private readonly DataContext _context;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<WatchlistController> _logger;

    public WatchlistController(
        DataContext context,
        UserManager<User> userManager,
        ILogger<WatchlistController> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    // Check if game is in watchlist
    [HttpGet("check/{id}")]
    public async Task<IActionResult> CheckWatchlist(int id)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            _logger.LogWarning("CheckWatchlist: User not authenticated");
            return Unauthorized(new { message = "User not authenticated" });
        }

        var game = await _context.Games
            .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id);

        return Ok(new
        {
            isWatchlisted = game != null,
            getNotified = game?.GetNotified ?? true,
            genre = game?.Genre ?? string.Empty,
            platform = game?.Platform ?? string.Empty
        });
    }

    // Add to watchlist
    [HttpPost("add/{id}")]
    public async Task<IActionResult> AddToWatchlist(int id, [FromBody] WatchlistGameDto gameDto)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            _logger.LogInformation($"AddToWatchlist: User {user?.Id}, Game {id}");

            if (user == null)
            {
                _logger.LogWarning("AddToWatchlist: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }

            var existingGame = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == gameDto.Platform);

            if (existingGame != null)
            {
                _logger.LogInformation($"AddToWatchlist: Game {id} already in watchlist for user {user.Id} on platform {gameDto.Platform}");
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

            _logger.LogInformation($"AddToWatchlist: Game {id} added for user {user.Id} on platform {gameDto.Platform}");

            return Ok(new { message = "Game added to watchlist" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"AddToWatchlist: Error for game {id}");
            return StatusCode(500, new { message = "Failed to add game to watchlist" });
        }
    }

    // Update notification setting
    [HttpPut("notify/{id}")]
    public async Task<IActionResult> UpdateNotificationSetting(int id, [FromBody] dynamic body)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                _logger.LogWarning("UpdateNotificationSetting: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }

            bool getNotified = body.getNotified;
            string platform = body.platform;

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == platform);

            if (game == null)
            {
                _logger.LogWarning($"UpdateNotificationSetting: Game {id} not found for user {user.Id} on platform {platform}");
                return NotFound(new { message = "Game not found in watchlist" });
            }

            game.GetNotified = getNotified;
            await _context.SaveChangesAsync();

            _logger.LogInformation($"UpdateNotificationSetting: Updated for game {id}, user {user.Id}, platform {platform}");

            return Ok(new { message = "Notification setting updated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"UpdateNotificationSetting: Error for game {id}");
            return StatusCode(500, new { message = "Failed to update notification setting" });
        }
    }

    // Remove from watchlist
    [HttpPost("remove/{id}")]
    public async Task<IActionResult> RemoveFromWatchlist(int id, [FromBody] dynamic body)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                _logger.LogWarning("RemoveFromWatchlist: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }

            string platform = body?.platform ?? string.Empty;

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == platform);

            if (game == null)
            {
                _logger.LogWarning($"RemoveFromWatchlist: Game {id} not found for user {user.Id} on platform {platform}");
                return NotFound(new { message = "Game not found in watchlist" });
            }

            _context.Games.Remove(game);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"RemoveFromWatchlist: Game {id} removed for user {user.Id} on platform {platform}");

            return Ok(new { message = "Game removed from watchlist" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"RemoveFromWatchlist: Error for game {id}");
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
                _logger.LogWarning("GetWatchlist: User not authenticated");
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
            _logger.LogError(ex, "GetWatchlist: Error");
            return StatusCode(500, new { message = "Failed to retrieve watchlist" });
        }
    }
}

// DTO for adding to watchlist
public class WatchlistGameDto
{
    public string GameTitle { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public string Genre { get; set; } = string.Empty;
    public bool GetNotified { get; set; } = true;
}