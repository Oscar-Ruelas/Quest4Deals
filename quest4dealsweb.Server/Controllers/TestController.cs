using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using quest4dealsweb.Server.models; // For TestEmailDto
using quest4dealsweb.Server.notifications; // For Program.SendEmailAsync
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization; // To protect the endpoint

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

        [HttpPost("send-email")]
        public async Task<IActionResult> SendTestEmail([FromBody] TestEmailDto emailDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                _logger.LogInformation($"Attempting to send test email to: {emailDto.RecipientEmail} with subject: {emailDto.Subject}");

                // Call the static SendEmailAsync method from your notifications Program class
                await Program.SendEmailAsync(emailDto.RecipientEmail, emailDto.Subject, emailDto.HtmlBody);

                _logger.LogInformation("Test email sent successfully.");
                return Ok(new { message = "Test email sent successfully." });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error sending test email.");
                return StatusCode(500, new { message = $"Failed to send test email: {ex.Message}" });
            }
        }
    }
}