using System;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Utils; // Required for MimeEntity.GenerateMessageId() and for creating image parts
using System.IO; // Required for File.ReadAllBytes

namespace quest4dealsweb.Server.notifications
{
    class Program
    {
        private static readonly string SmtpServer = "smtp.gmail.com";
        private static readonly int SmtpPort = 587;
        private static readonly string SmtpUsername = "quest4deals.notification@gmail.com";
        private static readonly string SmtpPassword = "ynwc mamy hrci sytz"; // Consider moving to config
        private static readonly string SenderEmail = "quest4deals.notification@gmail.com";
        private static readonly string SenderName = "Quest4Deals";

        // Path to the logo, relative to the server's execution directory
        // Adjust this path if you place your logo elsewhere within the server project.
        private static readonly string LogoPath = Path.Combine(AppContext.BaseDirectory, "EmailAssets", "logo.png");
        private const string LogoContentId = "logo_image_cid";


        public static void SendEmail(string recipientEmail, string emailHeader, string emailBody)
        {
            if (string.IsNullOrEmpty(recipientEmail) || string.IsNullOrEmpty(emailHeader) || string.IsNullOrEmpty(emailBody))
            {
                Console.WriteLine("Invalid Parameters in SendEmail");
                return;
            }
            try
            {
                SendEmailAsync(recipientEmail, emailHeader, emailBody).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending email (sync wrapper): {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }

        public static async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(SenderName, SenderEmail));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            var builder = new BodyBuilder();

            // Add the logo image as a linked resource
            if (File.Exists(LogoPath))
            {
                var image = builder.LinkedResources.Add(LogoPath);
                image.ContentId = MimeUtils.GenerateMessageId(); // Generate a unique CID
                // Update htmlBody to reference this CID
                // We'll append the image tag at the end of the provided htmlBody
                htmlBody += $"<br><hr><p style='text-align:center;'><img src='cid:{image.ContentId}' alt='Quest4Deals Logo' style='max-width:200px; height:auto;'></p>";
            }
            else
            {
                Console.WriteLine($"Warning: Logo image not found at {LogoPath}");
                htmlBody += "<br><hr><p style='text-align:center;'>Quest4Deals</p>"; // Fallback text
            }

            builder.HtmlBody = htmlBody;
            message.Body = builder.ToMessageBody();

            using (var client = new SmtpClient())
            {
                try
                {
                    await client.ConnectAsync(SmtpServer, SmtpPort, SecureSocketOptions.StartTls);
                    await client.AuthenticateAsync(SmtpUsername, SmtpPassword);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }
                catch (Exception ex)
                {
                    // Log the exception or rethrow it to be handled by the caller
                    Console.WriteLine($"Error in SendEmailAsync: {ex.Message}");
                    throw; // Rethrow to allow calling services to catch and log
                }
            }
        }
    }
}