

using System.Text.Json;

namespace quest4dealsweb.Server.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.Services;
using System;
using System.Net.Http;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class NexardaController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly DataContext _context; // Add this
    private readonly PriceHistoryService _priceHistoryService; // Add this

    public NexardaController(IHttpClientFactory httpClientFactory, IMemoryCache cache, DataContext context, PriceHistoryService priceHistoryService)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _priceHistoryService = priceHistoryService ?? throw new ArgumentNullException(nameof(priceHistoryService));
    }

    [HttpGet("games")]
    public async Task<IActionResult> GetGames([FromQuery] int page = 1, [FromQuery] int limit = 60)
    {
        try
        {
            string cacheKey = $"games_page_{page}_limit_{limit}";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent))
            {
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync($"search?type=games&page={page}&limit={limit}");
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));
            _cache.Set(cacheKey, content, cacheOptions);

            return Ok(content);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("product")]
    public async Task<IActionResult> GetProduct([FromQuery] string id, [FromQuery] string type = "game")
    {
        try
        {
            string cacheKey = $"product_{type}_{id}";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent))
            {
                // Still try to update price history even when using cached data
                await TryUpdatePriceHistoryFromCachedContent(cachedContent, id);
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync($"product?type={type}&id={id}");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();

            // Try to update the price history
            await TryUpdatePriceHistoryFromCachedContent(content, id);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));
            _cache.Set(cacheKey, content, cacheOptions);

            return Ok(content);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    // Add this helper method to NexardaController
    private async Task TryUpdatePriceHistoryFromCachedContent(string content, string idString)
    {
        try
        {
            if (!int.TryParse(idString, out int gameId))
                return;

            // Parse the JSON content
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            // Extract the current price from the response
            if (root.TryGetProperty("prices", out var pricesProp) &&
                pricesProp.TryGetProperty("lowest", out var lowestPriceProp) &&
                decimal.TryParse(lowestPriceProp.ToString(), out decimal currentPrice))
            {
                // Check if game exists in our database, if not create it
                var game = await _context.Games.FindAsync(gameId);
                if (game == null)
                {
                    // Extract game title
                    string title = "Unknown Game";
                    if (root.TryGetProperty("title", out var titleProp))
                    {
                        title = titleProp.GetString() ?? title;
                    }

                    string genre = "Not Specified";
                    if (root.TryGetProperty("genre", out var genreProp))
                    {
                        genre = genreProp.GetString() ?? genre;
                    }

                    game = new Game
                    {
                        Id = gameId,
                        Title = title,
                        Genre = genre,
                        Price = currentPrice,
                        UserId = "system", // Default user ID for system-created entries
                        Platform = "Unknown" // Default platform
                    };

                    _context.Games.Add(game);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    // Update the current price in the Games table if it's different
                    if (game.Price != currentPrice)
                    {
                        game.Price = currentPrice;
                        _context.Games.Update(game);
                        await _context.SaveChangesAsync();
                    }
                }

                // Update price history
                await _priceHistoryService.CheckAndUpdatePriceHistory(gameId, currentPrice);
            }
        }
        catch (Exception)
        {
            // Log the error but don't fail the request
            // This is a background task that shouldn't affect the main API response
        }
    }

    [HttpGet("retailers")]
    public async Task<IActionResult> GetRetailers()
    {
        try
        {
            string cacheKey = "retailers";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent))
            {
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync("retailers");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var allowedUsStoreNames = new[]
            {
                "Best Buy", "GameStop", "Walmart", "Target", "GameFly",
                "Steam", "Epic Games Store", "Humble Store", "PlayStation Store", "PlayStation Direct", 
                "Microsoft Store", "Nintendo eShop", "Kohl's"
            };

            // Filter root array
            var filteredStores = root.EnumerateArray()
                .Where(store =>
                    store.TryGetProperty("name", out var nameProp) &&
                    allowedUsStoreNames.Contains(nameProp.GetString()))
                .ToList();

            var filteredJson = JsonSerializer.Serialize(filteredStores, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            var cacheOptions = new MemoryCacheEntryOptions().SetSlidingExpiration(TimeSpan.FromMinutes(30));
            _cache.Set(cacheKey, filteredJson, cacheOptions);

            return Ok(filteredJson);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }


    [HttpGet("search")]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string query,
        [FromQuery] string type = "games",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 60)
    {
        try
        {
            string cacheKey = $"search_{query}_{type}_{page}_{limit}";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent))
            {
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync(
                $"search?q={Uri.EscapeDataString(query)}&type={type}&page={page}&limit={limit}");
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(5));
            _cache.Set(cacheKey, content, cacheOptions);

            return Ok(content);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

   [HttpGet("prices")]
public async Task<IActionResult> GetProductPrices(
    [FromQuery] string id, 
    [FromQuery] string type = "game", 
    [FromQuery] string currency = "USD")
{
    try
    {
        string cacheKey = $"prices_{type}_{id}_{currency}";

        if (_cache.TryGetValue(cacheKey, out string? cachedContent))
        {
            return Ok(cachedContent);
        }

        var client = _httpClientFactory.CreateClient("NexardaClient");
        var response = await client.GetAsync($"prices?type={type}&id={id}&currency={currency}");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();

        // Deserialize response into dynamic object
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        var allowedUsStoreNames = new[]
        {
            "Best Buy", "Target","Walmart", "GameStop",
            "GameFly", "PlayStation Store", "Epic Games Store", "Steam", "Humble Store",
            "Microsoft Store", "Nintendo eShop", "GOG", "Ubisoft Store"
        };

        // Copy metadata info
        var filteredResult = new
        {
            success = root.GetProperty("success").GetBoolean(),
            message = root.GetProperty("message").GetString(),
            info = root.GetProperty("info"),
            prices = new
            {
                currency = root.GetProperty("prices").GetProperty("currency").GetString(),
                lowest = root.GetProperty("prices").GetProperty("lowest").GetDecimal(),
                highest = root.GetProperty("prices").GetProperty("highest").GetDecimal(),
                stores = root.GetProperty("prices").GetProperty("stores").GetInt32(),
                offers = root.GetProperty("prices").GetProperty("offers").GetInt32(),
                editions = root.GetProperty("prices").GetProperty("editions"),
                regions = root.GetProperty("prices").GetProperty("regions"),
                list = root.GetProperty("prices").GetProperty("list")
                    .EnumerateArray()
                    .Where(entry => 
                        entry.TryGetProperty("store", out var store) &&
                        store.TryGetProperty("name", out var name) &&
                        allowedUsStoreNames.Contains(name.GetString())
                    ).ToList()
            }
        };

        var filteredJson = JsonSerializer.Serialize(filteredResult, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        var cacheOptions = new MemoryCacheEntryOptions().SetSlidingExpiration(TimeSpan.FromMinutes(5));
        _cache.Set(cacheKey, filteredJson, cacheOptions);

        return Ok(filteredJson);
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"Internal server error: {ex.Message}");
    }
}

}