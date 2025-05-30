using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    public async Task<IActionResult> CheckWatchlist(int id, [FromQuery] string platform) // Added platform query parameter
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            _logger.LogWarning("CheckWatchlist: User not authenticated");
            return Unauthorized(new { message = "User not authenticated" });
        }

        if (string.IsNullOrEmpty(platform))
        {
            _logger.LogWarning("CheckWatchlist: Platform parameter is missing.");
            return BadRequest(new { message = "Platform is required." });
        }

        var game = await _context.Games
            .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == platform);

        if (game == null)
        {
            return Ok(new
            {
                isWatchlisted = false,
            });
        }

        return Ok(new
        {
            isWatchlisted = true,
            getNotified = game.GetNotified,
            genre = game.Genre ?? string.Empty,
            platform = game.Platform ?? string.Empty,
            notificationType = game.NotificationType,
            priceThreshold = game.PriceThreshold
        });
    }

    // Add to watchlist
    [HttpPost("add/{id}")]
    public async Task<IActionResult> AddToWatchlist(int id, [FromBody] WatchlistGameDto gameDto)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            _logger.LogInformation($"AddToWatchlist: User {user?.Id}, Game {id}, Platform {gameDto.Platform}");

            if (user == null)
            {
                _logger.LogWarning("AddToWatchlist: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }

            if (string.IsNullOrEmpty(gameDto.Platform))
            {
                _logger.LogWarning($"AddToWatchlist: Platform is missing for game {id}");
                return BadRequest(new { message = "Platform is required." });
            }

            var existingGame = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == gameDto.Platform);

            if (existingGame != null)
            {
                _logger.LogInformation($"AddToWatchlist: Game {id} already in watchlist for user {user.Id} on platform {gameDto.Platform}");
                return BadRequest(new { message = "Game is already in your watchlist for this platform." });
            }

            var game = new Game
            {
                ExternalGameId = id,
                Title = gameDto.GameTitle,
                Platform = gameDto.Platform,
                Price = gameDto.CurrentPrice, // Initial price when added
                Genre = gameDto.Genre,
                UserId = user.Id,
                GetNotified = gameDto.GetNotified,
                NotificationType = gameDto.NotificationType,
                PriceThreshold = gameDto.NotificationType == "Threshold" ? gameDto.PriceThreshold : null,
                LastNotificationSentAt = null
            };
            _context.Games.Add(game);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"AddToWatchlist: Game {id} added for user {user.Id} on platform {gameDto.Platform}");
            return Ok(new { message = "Game added to watchlist" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"AddToWatchlist: Error for game {id}, platform {gameDto.Platform}");
            return StatusCode(500, new { message = "Failed to add game to watchlist" });
        }
    }

    // Update notification setting (and other watchlist item settings)
    [HttpPut("settings/{id}")] // Changed from "notify/{id}" to be more general
    public async Task<IActionResult> UpdateWatchlistSettings(int id, [FromBody] WatchlistGameDto gameDto)
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                _logger.LogWarning("UpdateWatchlistSettings: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }
            if (string.IsNullOrEmpty(gameDto.Platform))
            {
                _logger.LogWarning($"UpdateWatchlistSettings: Platform is missing for game {id}");
                return BadRequest(new { message = "Platform is required to identify the watchlist item." });
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == gameDto.Platform);

            if (game == null)
            {
                _logger.LogWarning($"UpdateWatchlistSettings: Game {id} not found for user {user.Id} on platform {gameDto.Platform}");
                return NotFound(new { message = "Game not found in watchlist for this platform." });
            }

            game.GetNotified = gameDto.GetNotified;
            game.NotificationType = gameDto.NotificationType;
            game.PriceThreshold = gameDto.NotificationType == "Threshold" ? gameDto.PriceThreshold : null;
            // Optionally reset LastNotificationSentAt if settings change significantly
            // game.LastNotificationSentAt = null; 

            _context.Games.Update(game);
            await _context.SaveChangesAsync();
            _logger.LogInformation($"UpdateWatchlistSettings: Updated for game {id}, user {user.Id}, platform {gameDto.Platform}");

            return Ok(new { message = "Watchlist settings updated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"UpdateWatchlistSettings: Error for game {id}, platform {gameDto.Platform}");
            return StatusCode(500, new { message = "Failed to update watchlist settings" });
        }
    }

    // Remove from watchlist
    [HttpPost("remove/{id}")]
    public async Task<IActionResult> RemoveFromWatchlist(int id, [FromBody] WatchlistGameDto gameDto) // gameDto here for platform
    {
        try
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                _logger.LogWarning("RemoveFromWatchlist: User not authenticated");
                return Unauthorized(new { message = "User not authenticated" });
            }

            if (string.IsNullOrEmpty(gameDto.Platform))
            {
                _logger.LogWarning($"RemoveFromWatchlist: Platform is missing for game {id}");
                return BadRequest(new { message = "Platform is required to identify the watchlist item." });
            }

            var game = await _context.Games
                .FirstOrDefaultAsync(g => g.ExternalGameId == id && g.UserId == user.Id && g.Platform == gameDto.Platform);

            if (game == null)
            {
                _logger.LogWarning($"RemoveFromWatchlist: Game {id} not found for user {user.Id} on platform {gameDto.Platform}");
                return NotFound(new { message = "Game not found in watchlist for this platform." });
            }

            _context.Games.Remove(game);
            await _context.SaveChangesAsync();
            _logger.LogInformation($"RemoveFromWatchlist: Game {id} removed for user {user.Id} on platform {gameDto.Platform}");

            return Ok(new { message = "Game removed from watchlist" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"RemoveFromWatchlist: Error for game {id}, platform {gameDto.Platform}");
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
                    g.GetNotified,
                    g.NotificationType,
                    g.PriceThreshold
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

// DTO for watchlist operations (ensure it's defined here or referenced if in a separate file)
// public class WatchlistGameDto ... (as defined previously)

// DTO for watchlist operations
// DTO for watchlist operations
public class WatchlistGameDto
{
    public string GameTitle { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public string Genre { get; set; } = string.Empty;
    public bool GetNotified { get; set; } = true;

    // New properties
    public string? NotificationType { get; set; } // e.g., "AnyChange", "Threshold"
    public decimal? PriceThreshold { get; set; }
}