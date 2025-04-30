namespace quest4dealsweb.Server.Controllers;

using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class RAWGController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RAWGController> _logger;
    private const string ApiKey = "73366dd5bac940d28ae476c4abf9abc5"; // Replace with your RAWG API key
    private const string BaseUrl = "https://api.rawg.io/api";

    public RAWGController(ILogger<RAWGController> logger)
    {
        _httpClient = new HttpClient();
        _logger = logger;
    }

    // GET: api/rawg/genres/{gameName}
    [HttpGet("genres/{gameName}")]
    public async Task<ActionResult<GenreResponse>> GetGameGenres(string gameName)
    {
        try
        {
            var url = $"{BaseUrl}/games?key={ApiKey}&search={gameName}&page_size=1";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            var searchResponse = JsonSerializer.Deserialize<GameSearchResponse>(json, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (searchResponse?.Results == null || !searchResponse.Results.Any())
            {
                return NotFound($"No game found with name '{gameName}'");
            }

            var game = searchResponse.Results.First();
            var genres = game.Genres.Select(g => g.Name).ToList();

            var genreResponse = new GenreResponse
            {
                GameName = game.Name,
                Genres = genres
            };

            return Ok(genreResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting genres for game: {gameName}");
            return StatusCode(500, "An error occurred while retrieving game genres");
        }
    }
    
}

// Response Models
public class GenreResponse
{
    public string GameName { get; set; }
    public List<string> Genres { get; set; }
}

public class GameSearchResponse
{
    public List<GameDetails> Results { get; set; }
}

public class GameDetails
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Genre> Genres { get; set; }
}

public class Genre
{
    public int Id { get; set; }
    public string Name { get; set; }
}