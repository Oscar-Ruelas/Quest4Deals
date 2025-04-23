public class Game
{
    public int Id { get; set; }
    
    public int ExternalGameId { get; set; } // ✅ Unique identifier for the game
    
    public string Title { get; set; } = string.Empty; 
    public string Genre { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool GetNotified { get; set; } = true;
    public string UserId { get; set; } // ✅ Foreign Key (No navigation property)
}