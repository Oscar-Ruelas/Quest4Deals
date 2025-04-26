using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using quest4dealsweb.Server.models;

namespace quest4dealsweb.Server.Endpoints;

public static class IdentityEndpoints
{
    public static RouteGroupBuilder MapIdentityRoutes(this IEndpointRouteBuilder app)
    {
        var identityRoutes = app.MapGroup("/api/auth");

        // Register User
        identityRoutes.MapPost("/register", async ([FromBody] RegisterModel model, 
            UserManager<User> userManager,
            ILogger<User> logger) =>
        {
            try
            {
                // Validate email
                if (await userManager.FindByEmailAsync(model.Email) != null)
                {
                    logger.LogWarning($"Registration attempted with existing email: {model.Email}");
                    return Results.BadRequest(new { Message = "Email is already in use." });
                }

                // Validate username
                if (await userManager.FindByNameAsync(model.UserName) != null)
                {
                    logger.LogWarning($"Registration attempted with existing username: {model.UserName}");
                    return Results.BadRequest(new { Message = "Username is already taken." });
                }

                // Create new user
                var user = new User
                {
                    Name = model.Name,
                    UserName = model.UserName,
                    Email = model.Email,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(user, model.Password);

                if (!result.Succeeded)
                {
                    logger.LogError($"Failed to create user: {string.Join(", ", result.Errors)}");
                    return Results.BadRequest(result.Errors);
                }

                logger.LogInformation($"User registered successfully: {user.Id}");
                return Results.Ok(new
                {
                    Message = "User registered successfully",
                    User = new
                    {
                        user.Id,
                        user.UserName,
                        user.Name,
                        user.Email
                    }
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during user registration");
                return Results.StatusCode(500);
            }
        });

        // Login User
        identityRoutes.MapPost("/login", async ([FromBody] LoginModel model, 
            SignInManager<User> signInManager, 
            UserManager<User> userManager,
            ILogger<User> logger) =>
        {
            try
            {
                // Find user by email or username
                var user = await userManager.FindByEmailAsync(model.UserNameOrEmail)
                    ?? await userManager.FindByNameAsync(model.UserNameOrEmail);

                if (user == null)
                {
                    logger.LogWarning($"Login attempted with non-existent user: {model.UserNameOrEmail}");
                    return Results.Unauthorized();
                }

                // Always sign out first to ensure clean session
                await signInManager.SignOutAsync();

                // Attempt login
                var result = await signInManager.PasswordSignInAsync(
                    user.UserName,
                    model.Password,
                    isPersistent: model.RememberMe,
                    lockoutOnFailure: false
                );

                if (!result.Succeeded)
                {
                    logger.LogWarning($"Failed login attempt for user: {user.Id}");
                    return Results.Unauthorized();
                }

                logger.LogInformation($"User logged in successfully: {user.Id}");
                return Results.Ok(new
                {
                    message = "Login successful",
                    user = new
                    {
                        user.Id,
                        user.UserName,
                        user.Email
                    }
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during login");
                return Results.StatusCode(500);
            }
        });

        // Get User Profile
        identityRoutes.MapGet("/profile", [Authorize] async (
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            ILogger<User> logger) =>
        {
            try
            {
                var user = await userManager.GetUserAsync(userClaims);

                if (user == null)
                {
                    logger.LogWarning("Profile request from unauthorized user");
                    return Results.Unauthorized();
                }

                logger.LogInformation($"Profile retrieved for user: {user.Id}");
                return Results.Ok(new
                {
                    Id = user.Id,
                    Name = user.Name,
                    UserName = user.UserName,
                    Email = user.Email
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error retrieving user profile");
                return Results.StatusCode(500);
            }
        });

        // Logout User
        identityRoutes.MapPost("/logout", async (
            SignInManager<User> signInManager,
            ILogger<User> logger) =>
        {
            try
            {
                await signInManager.SignOutAsync();
                logger.LogInformation("User logged out");
                return Results.Ok(new { Message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during logout");
                return Results.StatusCode(500);
            }
        });

        // Reset Password
        identityRoutes.MapPost("/reset-password", async ([FromBody] ResetPasswordModel model,
            UserManager<User> userManager,
            ILogger<User> logger) =>
        {
            try
            {
                var user = await userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    logger.LogWarning($"Password reset attempted for non-existent email: {model.Email}");
                    return Results.BadRequest("Invalid email");
                }

                var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
                var result = await userManager.ResetPasswordAsync(user, resetToken, model.NewPassword);

                if (!result.Succeeded)
                {
                    logger.LogWarning($"Password reset failed for user: {user.Id}");
                    return Results.BadRequest(result.Errors);
                }

                logger.LogInformation($"Password reset successful for user: {user.Id}");
                return Results.Ok(new { Message = "Password reset successful" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during password reset");
                return Results.StatusCode(500);
            }
        });

        // Update User Profile
        identityRoutes.MapPut("/update-profile", [Authorize] async (
            [FromBody] UpdateProfileModel model,
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            ILogger<User> logger) =>
        {
            try
            {
                var user = await userManager.GetUserAsync(userClaims);
                if (user == null)
                {
                    logger.LogWarning("Profile update attempted by unauthorized user");
                    return Results.Unauthorized();
                }

                // Check if new username is already taken (if username is being changed)
                if (model.UserName != user.UserName)
                {
                    var existingUser = await userManager.FindByNameAsync(model.UserName);
                    if (existingUser != null)
                    {
                        return Results.BadRequest(new { Message = "Username is already taken" });
                    }
                }

                // Check if new email is already taken (if email is being changed)
                if (model.Email != user.Email)
                {
                    var existingUser = await userManager.FindByEmailAsync(model.Email);
                    if (existingUser != null)
                    {
                        return Results.BadRequest(new { Message = "Email is already in use" });
                    }
                }

                user.Name = model.Name;
                user.UserName = model.UserName;
                user.Email = model.Email;

                var result = await userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    logger.LogWarning($"Profile update failed for user: {user.Id}");
                    return Results.BadRequest(result.Errors);
                }

                logger.LogInformation($"Profile updated for user: {user.Id}");
                return Results.Ok(new { Message = "User profile updated successfully" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error updating user profile");
                return Results.StatusCode(500);
            }
        });

        // Delete User Account
        identityRoutes.MapDelete("/delete", [Authorize] async (
            UserManager<User> userManager,
            ClaimsPrincipal userClaims,
            SignInManager<User> signInManager,
            ILogger<User> logger) =>
        {
            try
            {
                var user = await userManager.GetUserAsync(userClaims);
                if (user == null)
                {
                    logger.LogWarning("Account deletion attempted by unauthorized user");
                    return Results.Unauthorized();
                }

                var result = await userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    logger.LogWarning($"Account deletion failed for user: {user.Id}");
                    return Results.BadRequest(result.Errors);
                }

                await signInManager.SignOutAsync();
                logger.LogInformation($"User account deleted: {user.Id}");
                return Results.Ok(new { Message = "User account deleted successfully" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error deleting user account");
                return Results.StatusCode(500);
            }
        });

        return identityRoutes;
    }
}

// Models (if not already defined elsewhere)
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

public class ResetPasswordModel
{
    public string Email { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateProfileModel
{
    public string Name { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}