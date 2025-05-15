using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using quest4dealsweb.Server.models;
using EmailProgram = quest4dealsweb.Server.notifications.Program; // Alias
using quest4dealsweb.Server.Services;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System;

namespace quest4dealsweb.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
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

            string emailSubject = $"Quest4Deals: Price Update for {testData.GameTitle}";

            string emailBody = EmailContentHelper.GenerateEmailBody(
                userName: testData.UserName,
                gameTitle: testData.GameTitle,
                platform: testData.Platform,
                newPrice: testData.NewPrice,
                notificationType: testData.NotificationTypeToSimulate,
                priceThreshold: testData.PriceThreshold,
                oldPrice: testData.OldPrice,
                isTestEmail: false
            );

            try
            {
                _logger.LogInformation($"Attempting to send TEST (identical body) notification email to: {testData.RecipientEmail} with subject: {emailSubject}");
                await EmailProgram.SendEmailAsync(testData.RecipientEmail, emailSubject, emailBody);
                _logger.LogInformation("Test notification email sent successfully.");
                return Ok(new { message = "Test notification email sent successfully." });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error sending test notification email.");
                // THIS IS LIKELY THE LINE WITH THE ERROR (around original line 64)
                // Ensure "message:" is "message ="
                return StatusCode(500, new { message = $"Failed to send test notification email: {ex.Message}" });
            }
        }
    }
}