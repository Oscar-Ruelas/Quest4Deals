namespace quest4dealsweb.Server.models;

public class GamePriceTrendDto
{
    public int GameId { get; set; }
    public string Title { get; set; }
    public string Genre { get; set; }
    public string Platform { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal InitialPrice { get; set; }
    public decimal LowestPrice { get; set; }
    public decimal HighestPrice { get; set; }
    public decimal PriceChangePercentage { get; set; } // From initial to current
    public DateTime LastUpdated { get; set; }
    public int TotalPriceChanges { get; set; }
    public List<PricePoint> PricePoints { get; set; } = new List<PricePoint>();
}

public class PricePoint
{
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
}