

using System.Text.Json;

namespace quest4dealsweb.Server.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Net.Http;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class NexardaController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public NexardaController(IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
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
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync($"product?type={type}&id={id}");
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
            "Microsoft Store", "Nintendo eShop", "GOG"
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