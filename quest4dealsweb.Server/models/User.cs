namespace quest4dealsweb.Server.models;

public class User
{
    public int Id { get; set; } // Primary Key
    public string Name { get; set; } = string.Empty; // Not null
    public string Username { get; set; } = string.Empty; // Unique
    public string Email { get; set; } = string.Empty; // Unique
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Default value
}
