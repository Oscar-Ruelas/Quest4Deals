public class Game
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty; 
    public string Genre { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public decimal Price { get; set; }

    public string UserId { get; set; } // ✅ Foreign Key (No navigation property)
}