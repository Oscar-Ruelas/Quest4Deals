namespace quest4dealsweb.Server.Endpoints;

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;

    public SmtpEmailSender(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendAsync(string toEmail, string subject, string body)
    {
        var smtpHost = "smtp.gmail.com";
        var smtpPort = 587;
        var smtpUser = _config["Gmail:Username"];
        var smtpPass = _config["Gmail:AppPassword"];
        var fromEmail = _config["Gmail:FromEmail"];
        var fromName = _config["Gmail:FromName"];

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl = true
        };

        var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };

        message.To.Add(toEmail);

        await client.SendMailAsync(message);
    }
}
