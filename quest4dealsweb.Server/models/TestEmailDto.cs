using System.ComponentModel.DataAnnotations;

namespace quest4dealsweb.Server.models
{
    public class TestEmailDto
    {
        [Required]
        [EmailAddress]
        public string RecipientEmail { get; set; } = string.Empty;

        [Required]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string HtmlBody { get; set; } = string.Empty;
    }
}
