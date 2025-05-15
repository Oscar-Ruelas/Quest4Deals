using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Endpoints;

public static class IdentityEndpoints
{
    private static readonly Dictionary<string, (string Code, string Token)> PendingEmailConfirmations = new();
    private static readonly Dictionary<string, (string Code, string Token)> PendingPasswordResets = new();

    public static RouteGroupBuilder MapIdentityRoutes(this IEndpointRouteBuilder app)
    {
        var identityRoutes = app.MapGroup("/api/auth");

        // REGISTER: Create user and send 6-digit confirmation code
        identityRoutes.MapPost("/register", async (
            [FromBody] RegisterModel model,
            UserManager<User> userManager,
            ILogger<User> logger,
            IEmailSender emailSender) =>
        {
            if (await userManager.FindByEmailAsync(model.Email) != null)
                return Results.BadRequest(new { Message = "Email is already in use." });

            if (await userManager.FindByNameAsync(model.UserName) != null)
                return Results.BadRequest(new { Message = "Username is already taken." });

            var user = new User
            {
                Name = model.Name,
                UserName = model.UserName,
                Email = model.Email,
                CreatedAt = DateTime.UtcNow
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var code = new Random().Next(100000, 999999).ToString();

            PendingEmailConfirmations[user.Email] = (code, token);

            await emailSender.SendAsync(user.Email, "Your Quest4Deals Confirmation Code",
                $"Your confirmation code is: {code}");

            logger.LogInformation($"User registered. Confirmation code sent to {user.Email}");

            // ✅ Return frontend-friendly redirect instruction
            return Results.Ok(new
            {
                Message = "Confirmation code sent to email.",
                RedirectTo = "/verify-email",
                Email = user.Email
            });
        });
        
        

        // VERIFY: Accepts 6-digit code and confirms email using stored token
        identityRoutes.MapPost("/verify-email", async (
            [FromBody] EmailCodeVerificationModel model,
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            ILogger<User> logger) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Results.BadRequest(new { Message = "User not found." });

            if (!PendingEmailConfirmations.TryGetValue(model.Email, out var entry))
                return Results.BadRequest(new { Message = "No pending verification found." });

            if (entry.Code != model.Code)
                return Results.BadRequest(new { Message = "Invalid confirmation code." });

            var result = await userManager.ConfirmEmailAsync(user, entry.Token);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            PendingEmailConfirmations.Remove(model.Email);

            // ✅ Sign in the user directly
            await signInManager.SignInAsync(user, isPersistent: true);

            logger.LogInformation($"Email confirmed and user logged in: {user.Id}");

            return Results.Ok(new
            {
                Message = "Email confirmed successfully.",
                User = new { user.Id, user.UserName, user.Email, user.Name }
            });
        });

        
        identityRoutes.MapPost("/new-email", async (
            [FromBody] EmailUpdateRequestModel model,
            UserManager<User> userManager,
            ILogger<User> logger,
            IEmailSender emailSender) =>
        {
            var user = await userManager.FindByEmailAsync(model.OldEmail);
            if (user == null)
                return Results.BadRequest(new { Message = "Original email not found." });

            if (user.EmailConfirmed)
                return Results.BadRequest(new { Message = "Email is already confirmed." });

            // Check if the new email is already taken
            if (await userManager.FindByEmailAsync(model.NewEmail) != null)
                return Results.BadRequest(new { Message = "New email is already in use." });

            // Update the user's email
            user.Email = model.NewEmail;
            user.UserName = model.NewEmail; // optional if you're using email as username
            var updateResult = await userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
                return Results.BadRequest(updateResult.Errors);

            // Generate new token and 6-digit code
            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var code = new Random().Next(100000, 999999).ToString();

            PendingEmailConfirmations[model.NewEmail] = (code, token);

            await emailSender.SendAsync(model.NewEmail, "Your Updated Quest4Deals Confirmation Code",
                $"Your new confirmation code is: {code}");

            logger.LogInformation($"Email updated from {model.OldEmail} to {model.NewEmail}, new confirmation sent.");

            return Results.Ok(new
            {
                Message = "Email updated. New confirmation code sent.",
                RedirectTo = "/verify-email",
                Email = model.NewEmail
            });
        });


        identityRoutes.MapPost("/login", async ([FromBody] LoginModel model,
            SignInManager<User> signInManager,
            UserManager<User> userManager,
            ILogger<User> logger) =>
        {
            var user = await userManager.FindByEmailAsync(model.UserNameOrEmail)
                       ?? await userManager.FindByNameAsync(model.UserNameOrEmail);

            if (user == null)
            {
                logger.LogWarning($"Login attempt failed: User not found ({model.UserNameOrEmail})");
                return Results.Unauthorized();
            }

            if (!user.EmailConfirmed)
            {
                logger.LogWarning($"Login blocked: Email not confirmed for user {user.Email}");
                return Results.BadRequest(new
                {
                    Message = "EmailNotConfirmed",
                    RedirectTo = "/verify-email",
                    Email = user.Email
                });
            }

            await signInManager.SignOutAsync();
            var result = await signInManager.PasswordSignInAsync(
                user.UserName, model.Password, model.RememberMe, lockoutOnFailure: false);

            if (!result.Succeeded)
            {
                logger.LogWarning($"Login attempt failed: Invalid password for user {user.Email}");
                return Results.Unauthorized();
            }

            logger.LogInformation($"Login successful for user {user.Id}");

            return Results.Ok(new
            {
                Message = "Login successful",
                User = new { user.Id, user.UserName, user.Email }
            });
        });


        // PROFILE
        identityRoutes.MapGet("/profile", [Authorize] async (
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            ILogger<User> logger) =>
        {
            var user = await userManager.GetUserAsync(userClaims);
            if (user == null) return Results.Unauthorized();

            return Results.Ok(new
            {
                Id = user.Id,
                Name = user.Name,
                UserName = user.UserName,
                Email = user.Email
            });
        });

        // LOGOUT
        identityRoutes.MapPost("/logout", async (
            SignInManager<User> signInManager,
            ILogger<User> logger) =>
        {
            await signInManager.SignOutAsync();
            return Results.Ok(new { Message = "Logged out successfully" });
        });
        
        identityRoutes.MapPost("/resend-code", async (
            [FromBody] ResendCodeRequest model,
            UserManager<User> userManager,
            IEmailSender emailSender,
            ILogger<User> logger) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Results.BadRequest(new { Message = "User not found." });

            if (user.EmailConfirmed)
                return Results.BadRequest(new { Message = "Email is already confirmed." });

            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var code = new Random().Next(100000, 999999).ToString();

            PendingEmailConfirmations[model.Email] = (code, token);

            await emailSender.SendAsync(user.Email, "Your Quest4Deals Confirmation Code",
                $"Your new confirmation code is: {code}");

            logger.LogInformation($"Resent confirmation code to {user.Email}");
            return Results.Ok(new { Message = "Code resent successfully." });
        });

        // RESET PASSWORD
        identityRoutes.MapPost("/request-password-reset", async (
            [FromBody] ResetPasswordRequestModel model,
            UserManager<User> userManager,
            IEmailSender emailSender,
            ILogger<User> logger) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Results.BadRequest(new { Message = "Email not found." });

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var code = new Random().Next(100000, 999999).ToString();

            PendingPasswordResets[model.Email] = (code, token);

            await emailSender.SendAsync(model.Email, "Quest4Deals Password Reset Code",
                $"Use this code to reset your password: {code}");

            logger.LogInformation($"Reset code sent to {model.Email}");

            return Results.Ok(new { Message = "Reset code sent to email." });
        });
        
        identityRoutes.MapPost("/confirm-password-reset", async (
            [FromBody] ConfirmPasswordResetModel model,
            UserManager<User> userManager,
            ILogger<User> logger) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Results.BadRequest(new { Message = "Invalid email" });

            if (!PendingPasswordResets.TryGetValue(model.Email, out var entry) || entry.Code != model.Code)
                return Results.BadRequest(new { Message = "Invalid or expired reset code" });

            var result = await userManager.ResetPasswordAsync(user, entry.Token, model.NewPassword);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            PendingPasswordResets.Remove(model.Email);

            logger.LogInformation($"Password reset for {model.Email}");

            return Results.Ok(new { Message = "Password has been reset successfully" });
        });


        // UPDATE PROFILE
        identityRoutes.MapPut("/update-profile", [Authorize] async (
            [FromBody] UpdateProfileModel model,
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            ILogger<User> logger) =>
        {
            var user = await userManager.GetUserAsync(userClaims);
            if (user == null) return Results.Unauthorized();

            if (model.UserName != user.UserName && await userManager.FindByNameAsync(model.UserName) != null)
                return Results.BadRequest(new { Message = "Username is already taken" });

            if (model.Email != user.Email && await userManager.FindByEmailAsync(model.Email) != null)
                return Results.BadRequest(new { Message = "Email is already in use" });

            user.Name = model.Name;
            user.UserName = model.UserName;
            user.Email = model.Email;

            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
                return Results.BadRequest(updateResult.Errors);

            if (!string.IsNullOrWhiteSpace(model.NewPassword))
            {
                if (string.IsNullOrWhiteSpace(model.CurrentPassword))
                    return Results.BadRequest(new { Message = "Current password is required to change password." });

                var passwordResult = await userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
                if (!passwordResult.Succeeded)
                    return Results.BadRequest(new { Message = "Failed to change password", Errors = passwordResult.Errors });
            }

            return Results.Ok(new { Message = "User profile updated successfully" });
        });


        // DELETE ACCOUNT
        identityRoutes.MapDelete("/delete", [Authorize] async (
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            SignInManager<User> signInManager,
            ILogger<User> logger) =>
        {
            var user = await userManager.GetUserAsync(userClaims);
            if (user == null) return Results.Unauthorized();

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            await signInManager.SignOutAsync();
            return Results.Ok(new { Message = "User account deleted successfully" });
        });

        return identityRoutes;
    }
}




// Models

public class RegisterModel
{
    public string Name { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginModel
{
    public string UserNameOrEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}



public class UpdateProfileModel
{
    public string Name { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public string? CurrentPassword { get; set; }  // optional, only required if changing password
    public string? NewPassword { get; set; }      // optional
}


public class EmailCodeVerificationModel
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class EmailUpdateRequestModel
{
    public string OldEmail { get; set; } = string.Empty;
    public string NewEmail { get; set; } = string.Empty;
}

public class ResendCodeRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequestModel
{
    public string Email { get; set; } = string.Empty;
}

public class ConfirmPasswordResetModel
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
