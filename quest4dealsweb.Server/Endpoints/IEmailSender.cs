namespace quest4dealsweb.Server.Endpoints;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body);
}