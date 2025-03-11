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
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Game>>> GetGames()
    {
        return await _context.Games.Include(g => g.User).ToListAsync();
        
    }
    
    [HttpPost]
    public async Task<ActionResult<Game>> CreateGame(Game game)
    {
        var user = await _context.Users.FindAsync(game.UserId);
        if (user == null)
        {
            return BadRequest("User not found.");
        }

        _context.Games.Add(game);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGames), new { id = game.Id }, game);
    }
}