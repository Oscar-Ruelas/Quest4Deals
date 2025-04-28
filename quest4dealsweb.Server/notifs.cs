using System;
using System.Threading.Tasks;
// Remove the System.Net.Mail import to avoid conflicts with MailKit
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EmailSender
{
    class Program
    {
        // Email configuration with your specified values
        private static readonly string SmtpServer = "smtp.gmail.com";
        private static readonly int SmtpPort = 587;
        private static readonly string SmtpUsername = "quest4deals.notification@gmail.com";
        private static readonly string SmtpPassword = "ynwc mamy hrci sytz";
        private static readonly string SenderEmail = "quest4deals.notification@gmail.com";
        private static readonly string RecipientEmail = "adrianlfudge@gmail.com";

        // Email contents
        private static readonly string SenderName = "Quest4Deals";
        private static readonly string EmailHeader = "Saved Game Price Change Notification";
        private static readonly string EmailBody = "<p>Your saved game <GAME> has hit the price threshold of <PRICE_THRESHOLD> that you set on the <PLATFORM> platform</p>";

        // Changed the name to Main to make it the program entry point
        // Add this new method to your class
        public static void TestEmailSending()
        {
            Console.WriteLine("Email Test Starting...");

            try
            {
                // This line runs the task synchronously
                SendEmailAsync(
                    RecipientEmail,
                    EmailHeader,
                    EmailBody).GetAwaiter().GetResult();

                Console.WriteLine("Email sent successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending email: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }

            Console.WriteLine("Press any key to continue...");
            Console.ReadKey();
        }


        public static async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(SenderName, SenderEmail));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };

            message.Body = bodyBuilder.ToMessageBody();

            using (var client = new SmtpClient())
            {
                // This line enables client debugging output to console
                client.Connect(SmtpServer, SmtpPort, SecureSocketOptions.StartTls);

                // Authenticate with the SMTP server
                client.Authenticate(SmtpUsername, SmtpPassword);

                // Send the email
                await client.SendAsync(message);

                // Disconnect properly
                await client.DisconnectAsync(true);
            }
        }
    }
}
