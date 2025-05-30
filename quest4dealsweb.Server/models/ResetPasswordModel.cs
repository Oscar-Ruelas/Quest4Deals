namespace quest4dealsweb.Server.models;

public class ResetPasswordModel
{
    public string Email { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}