using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Controllers;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
[ApiController]
[Route("api/games")]
public class GameController: ControllerBase
{
    private readonly DataContext _context;
    
    public GameController(DataContext context)
    {
        _context = context;
    }
    
    /*[HttpGet]
    public async Task<ActionResult<IEnumerable<Game>>> GetGames()
    {
        return await _context.Games.Include(g => g.User).ToListAsync();
        
    }*/
    
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Game>>> GetUserGames(string userId)
    {
        var userGames = await _context.Games
            .Where(g => g.UserId == userId) // ✅ Filter by UserId
            .ToListAsync();

        if (userGames == null || userGames.Count == 0)
        {
            return NotFound("No games found for this user.");
        }

        return Ok(userGames);
    }




    
    [HttpPost]
    public async Task<ActionResult<Game>> CreateGame(Game game)
    {
        // ✅ Check if the User exists before adding the game
        var userExists = await _context.Users.AnyAsync(u => u.Id == game.UserId);
        if (!userExists)
        {
            return BadRequest("User not found.");
        }

        _context.Games.Add(game); // ✅ No need to attach User
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserGames), new { userId = game.UserId }, game);
    }


}