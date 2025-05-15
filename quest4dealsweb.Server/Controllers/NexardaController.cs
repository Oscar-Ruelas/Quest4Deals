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
using Microsoft.Extensions.Logging;

[ApiController]
[Route("api/[controller]")]
public class NexardaController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly DataContext _context;
    private readonly PriceHistoryService _priceHistoryService;
    private readonly ILogger<NexardaController> _logger; // Declare the logger field

    public NexardaController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        DataContext context,
        PriceHistoryService priceHistoryService,
        ILogger<NexardaController> logger)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _priceHistoryService = priceHistoryService ?? throw new ArgumentNullException(nameof(priceHistoryService));
        _logger = logger;
    }

    [HttpGet("games")]
    public async Task<IActionResult> GetGames([FromQuery] int page = 1, [FromQuery] int limit = 60)
    {
        try
        {
            var cacheKey = $"games_page_{page}_limit_{limit}";
            if (_cache.TryGetValue(cacheKey, out string? cachedContent)) return Ok(cachedContent);

            _logger.LogInformation($"Fetching games from Nexarda: page {page}, limit {limit}"); // Example logger use

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
            _logger.LogError(ex, "Error in GetGames"); // Example logger use
            return StatusCode(500, $"Internal server error: {ex.Message}");
}
    }

    [HttpGet("games/filter")]
    public async Task<IActionResult> FilterGames(
        [FromQuery] string? genre = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? priceSort = null, // use "asc" or "desc" for finding lowest/highest price or highest/lowest price
        [FromQuery] int page = 1,
        [FromQuery] int limit = 60)
    {
        try
        {
            var cacheKey = $"games_filter_{genre}_{platform}_{priceSort}_page_{page}_limit_{limit}";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent)) return Ok(cachedContent);

            var client = _httpClientFactory.CreateClient("NexardaClient");

            var queryParts = new List<string> { "type=games", $"page={page}", $"limit={limit}" };
            if (!string.IsNullOrWhiteSpace(genre)) queryParts.Add($"game.genres={Uri.EscapeDataString(genre)}");

            var queryString = string.Join("&", queryParts);
            var response = await client.GetAsync($"search?{queryString}");
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            var data = JsonSerializer.Deserialize<JsonElement>(content);
            var items = data.GetProperty("results").GetProperty("items").EnumerateArray();

            // Filter by platform
            var filteredItems = items
                .Where(item =>
                {
                    if (!string.IsNullOrWhiteSpace(platform))
                    {
                        if (!item.GetProperty("game_info").TryGetProperty("platforms", out var platforms))
                            return false;

                        return platforms.EnumerateArray()
                            .Any(p => string.Equals(p.GetProperty("slug").GetString(), platform,
                                StringComparison.OrdinalIgnoreCase));
                    }

                    return true;
                })
                .ToList();

            // Sort by lowest price
            if (priceSort?.ToLower() == "asc")
                filteredItems = filteredItems
                    .OrderBy(item => item.GetProperty("game_info").GetProperty("lowest_price").GetDecimal())
                    .ToList();
            else if (priceSort?.ToLower() == "desc")
                filteredItems = filteredItems
                    .OrderByDescending(item => item.GetProperty("game_info").GetProperty("lowest_price").GetDecimal())
                    .ToList();

            // Pagination after filtering/sorting
            var pagedItems = filteredItems
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToList();

            // Extract metadata for result
            var success = data.GetProperty("success");
            var message = data.GetProperty("message");
            var pageValue = page;
            var pagesValue = (int)Math.Ceiling((double)filteredItems.Count / limit);

            var resultObject = new
            {
                success,
                message,
                results = new
                {
                    page = pageValue,
                    pages = pagesValue,
                    shown = pagedItems.Count,
                    total = filteredItems.Count,
                    items = pagedItems
                }
            };

            var modifiedContent = JsonSerializer.Serialize(resultObject);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(10));

            _cache.Set(cacheKey, modifiedContent, cacheOptions);

            return Ok(modifiedContent);
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
            var cacheKey = $"product_{type}_{id}";
            if (_cache.TryGetValue(cacheKey, out string? cachedContent) && cachedContent != null)
            {
                // Still try to update price history even when using cached data
                await TryUpdatePriceHistoryFromProductDetails(cachedContent, id);
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync($"product?type={type}&id={id}");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            await TryUpdatePriceHistoryFromProductDetails(content, id); // Update history

            var cacheOptions = new MemoryCacheEntryOptions().SetSlidingExpiration(TimeSpan.FromMinutes(10));
            _cache.Set(cacheKey, content, cacheOptions);

            return Ok(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error in GetProduct for id {id}");
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    private async Task TryUpdatePriceHistoryFromPricesEndpoint(string content, string externalGameIdString)
    {
        try
        {
            if (!int.TryParse(externalGameIdString, out int externalGameId))
            {
                _logger.LogError($"Invalid externalGameIdString for prices endpoint: {externalGameIdString}");
                return;
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            string gameTitle = root.TryGetProperty("info", out var infoProp) &&
                               infoProp.TryGetProperty("title", out var titleProp) ?
                               titleProp.GetString() ?? "Unknown Game" : "Unknown Game";

            if (root.TryGetProperty("prices", out var pricesNode) && pricesNode.TryGetProperty("list", out var offersList))
            {
                foreach (var offerElement in offersList.EnumerateArray())
                {
                    if (offerElement.TryGetProperty("price", out var priceProp) && priceProp.TryGetDecimal(out decimal offerPrice))
                    {
                        // Determine platform from offer if possible
                        // The example `edition_full` "FOR:Steam" was from `GameDetails.tsx` parsing.
                        // Nexarda's /prices list might have platform info differently.
                        // Assuming 'platform' is a field in the offer or derivable.
                        string platform = "Unknown"; // Placeholder
                        if (offerElement.TryGetProperty("platform", out var platProp) && platProp.ValueKind == JsonValueKind.String)
                        {
                            platform = platProp.GetString() ?? "Unknown";
                        }
                        else if (offerElement.TryGetProperty("edition_full", out var editionFullProp) && editionFullProp.ValueKind == JsonValueKind.String)
                        {
                            var editionFull = editionFullProp.GetString();
                            if (!string.IsNullOrEmpty(editionFull))
                            {
                                var match = System.Text.RegularExpressions.Regex.Match(editionFull, @"FOR:(.+)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                                if (match.Success)
                                {
                                    platform = match.Groups[1].Value.Trim();
                                }
                            }
                        }
                        _logger.LogInformation($"From /prices endpoint for {gameTitle} (ID: {externalGameId}), found offer on {platform} for {offerPrice:C}");
                        await _priceHistoryService.CheckAndUpdatePriceHistory(externalGameId, gameTitle, offerPrice, platform);
                    }
                }
            }
            else
            {
                _logger.LogWarning($"Could not find offers list for ExternalGameId: {externalGameId} in /prices endpoint content.");
            }
        }
        catch (JsonException jsonEx)
        {
            _logger.LogError(jsonEx, $"JSON parsing error in TryUpdatePriceHistoryFromPricesEndpoint for ExternalGameId: {externalGameIdString}. Content: {content.Substring(0, Math.Min(content.Length, 500))}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error in TryUpdatePriceHistoryFromPricesEndpoint for ExternalGameId: {externalGameIdString}");
        }
    }

    // Add this helper method to NexardaController
    private async Task TryUpdatePriceHistoryFromProductDetails(string content, string externalGameIdString)
    {
        try
        {
            if (!int.TryParse(externalGameIdString, out int externalGameId))
            {
                _logger.LogError($"Invalid externalGameIdString: {externalGameIdString}");
                return;
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            // Default platform, can be refined if product details include it
            string platform = "Unknown"; // You might need to determine platform more accurately
            string gameTitle = root.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? "Unknown Game" : "Unknown Game";

            // This is from the /product endpoint. The prices are usually in a different structure
            // Let's assume the 'lowest' price from the 'prices' object if available
            if (root.TryGetProperty("prices", out var pricesProp) &&
                pricesProp.TryGetProperty("lowest", out var lowestPriceProp) &&
                lowestPriceProp.TryGetDecimal(out decimal currentPrice))
            {
                _logger.LogInformation($"Attempting to update price history for {gameTitle} (ID: {externalGameId}) from product details. New lowest price: {currentPrice}");
                // We need to determine the platform for this price.
                // The /product endpoint doesn't seem to specify platform for the lowest price directly.
                // This is a simplification. You might need to iterate offers if platform matters here.
                await _priceHistoryService.CheckAndUpdatePriceHistory(externalGameId, gameTitle, currentPrice, platform);
            }
            else if (root.TryGetProperty("game_info", out var gameInfo) &&
                     gameInfo.TryGetProperty("lowest_price", out var lowestPriceGameInfo) &&
                     lowestPriceGameInfo.TryGetDecimal(out decimal currentPriceFromGameInfo))
            {
                _logger.LogInformation($"Attempting to update price history for {gameTitle} (ID: {externalGameId}) from game_info. New lowest price: {currentPriceFromGameInfo}");
                // This is often from search results. Platform might be more available here or needs to be assumed.
                await _priceHistoryService.CheckAndUpdatePriceHistory(externalGameId, gameTitle, currentPriceFromGameInfo, platform);
            }
            else
            {
                _logger.LogWarning($"Could not extract current price for ExternalGameId: {externalGameId} from product details content.");
            }
        }
        catch (JsonException jsonEx)
        {
            _logger.LogError(jsonEx, $"JSON parsing error in TryUpdatePriceHistoryFromProductDetails for ExternalGameId: {externalGameIdString}. Content: {content.Substring(0, Math.Min(content.Length, 500))}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error in TryUpdatePriceHistoryFromProductDetails for ExternalGameId: {externalGameIdString}");
        }
    }

    [HttpGet("retailers")]
    public async Task<IActionResult> GetRetailers()
    {
        try
        {
            var cacheKey = "retailers";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent)) return Ok(cachedContent);

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
            var cacheKey = $"search_{query}_{type}_{page}_{limit}";

            if (_cache.TryGetValue(cacheKey, out string? cachedContent)) return Ok(cachedContent);

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
            var cacheKey = $"prices_{type}_{id}_{currency}";
            if (_cache.TryGetValue(cacheKey, out string? cachedContent) && cachedContent != null)
            {
                await TryUpdatePriceHistoryFromPricesEndpoint(cachedContent, id); // Update from cache
                return Ok(cachedContent);
            }

            var client = _httpClientFactory.CreateClient("NexardaClient");
            var response = await client.GetAsync($"prices?type={type}&id={id}&currency={currency}");
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            await TryUpdatePriceHistoryFromPricesEndpoint(content, id); // Update from live call


            // Deserialize response into dynamic object
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var allowedUsStoreNames = new[]
            {
                "Best Buy", "Target", "Walmart", "GameStop",
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
            _cache.Set(cacheKey, content, cacheOptions); // Cache the original, unfiltered content from Nexarda, or the filtered one

            return Ok(content); // Or return your filteredJson
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error in GetProductPrices for id {id}");
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}