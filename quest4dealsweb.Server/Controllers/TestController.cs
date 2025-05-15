using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using quest4dealsweb.Server.models;
using EmailProgram = quest4dealsweb.Server.notifications.Program; // Alias for notifications.Program
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System; // For StringComparison

namespace quest4dealsweb.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires authentication to use this endpoint
    public class TestController : ControllerBase
    {
        private readonly ILogger<TestController> _logger;

        public TestController(ILogger<TestController> logger)
        {
            _logger = logger;
        }

        [HttpPost("send-notification-email")]
        public async Task<IActionResult> SendTestNotificationEmail([FromBody] TestEmailDto testData)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.Equals(testData.NotificationTypeToSimulate, "Threshold", StringComparison.OrdinalIgnoreCase) && !testData.PriceThreshold.HasValue)
            {
                return BadRequest(new { message = "PriceThreshold is required when NotificationTypeToSimulate is 'Threshold'." });
            }

            string emailSubject = $"Quest4Deals: TEST Price Update for {testData.GameTitle}";
            string emailBody;

            if (string.Equals(testData.NotificationTypeToSimulate, "Threshold", StringComparison.OrdinalIgnoreCase) && testData.PriceThreshold.HasValue)
            {
                emailBody = $@"
                    <p>Hello {testData.UserName},</p>
                    <p>This is a <b>TEST</b> notification.</p>
                    <p>The price for <b>{testData.GameTitle}</b> on <b>{testData.Platform}</b> has reached your set threshold of <b>{testData.PriceThreshold.Value:C}</b>!</p>
                    <p>The current price is now <b>{testData.NewPrice:C}</b>.</p>
                    <p>Happy deal hunting!</p>
                    <p>The Quest4Deals Team (Test System)</p>";
            }
            else // Simulating "AnyChange" or fallback
            {
                string oldPriceString = testData.OldPrice.HasValue ? $"{testData.OldPrice.Value:C}" : "a previous price";
                emailBody = $@"
                    <p>Hello {testData.UserName},</p>
                    <p>This is a <b>TEST</b> notification.</p>
                    <p>There's a price update for <b>{testData.GameTitle}</b> on <b>{testData.Platform}</b>.</p>
                    <p>The price has changed from {oldPriceString} to <b>{testData.NewPrice:C}</b>.</p>
                    <p>Happy deal hunting!</p>
                    <p>The Quest4Deals Team (Test System)</p>";
            }

            try
            {
                _logger.LogInformation($"Attempting to send TEST notification email to: {testData.RecipientEmail} with subject: {emailSubject}");

                await EmailProgram.SendEmailAsync(testData.RecipientEmail, emailSubject, emailBody);

                _logger.LogInformation("Test notification email sent successfully.");
                return Ok(new { message = "Test notification email sent successfully." });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error sending test notification email.");
                return StatusCode(500, new { message = $"Failed to send test notification email: {ex.Message}" });
            }
        }
    }
}