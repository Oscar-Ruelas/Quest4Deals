namespace quest4dealsweb.Server.models;

using Microsoft.AspNetCore.Identity;

public class User : IdentityUser 
{
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
