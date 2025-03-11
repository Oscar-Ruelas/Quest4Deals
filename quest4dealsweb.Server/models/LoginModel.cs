namespace quest4dealsweb.Server.models;

public class LoginModel
{
    public string UserNameOrEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}