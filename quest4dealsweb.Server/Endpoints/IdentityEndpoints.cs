using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using quest4dealsweb.Server.models;
namespace quest4dealsweb.Server.Endpoints;

public static class IdentityEndpoints
{
    public static RouteGroupBuilder MapIdentityRoutes(this IEndpointRouteBuilder app)
    {
        var identityRoutes = app.MapGroup("/api/auth");

        // ✅ Register User
        identityRoutes.MapPost("/register", async ([FromBody] RegisterModel model, UserManager<User> userManager) =>
        {
            var user = new User
            {
                Name = model.Name,
                UserName = model.UserName,
                Email = model.Email
            };

            var result = await userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded)
            {
                return Results.BadRequest(result.Errors);
            }

            return Results.Ok(new { Message = "User registered successfully" });
        });

        // ✅ Login User (using email OR username)
        identityRoutes.MapPost("/login", async ([FromBody] LoginModel model, SignInManager<User> signInManager, UserManager<User> userManager) =>
        {
            var user = await userManager.FindByEmailAsync(model.UserNameOrEmail)
                       ?? await userManager.FindByNameAsync(model.UserNameOrEmail);

            if (user == null)
                return Results.Unauthorized();

            var result = await signInManager.PasswordSignInAsync(user.UserName, model.Password, isPersistent: false, lockoutOnFailure: false);

            if (!result.Succeeded)
                return Results.Unauthorized();

            // ✅ Generate JWT token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("YourSecretKey123456"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: "https://yourbackend.com",
                audience: "https://yourfrontend.com",
                claims: new List<Claim> { new Claim(ClaimTypes.Name, user.UserName) },
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds
            );

            return Results.Ok(new
            {
                Message = "Login successful",
                Token = new JwtSecurityTokenHandler().WriteToken(token)
            });
        });

        // ✅ Logout User
        identityRoutes.MapPost("/logout", async (SignInManager<User> signInManager) =>
        {
            await signInManager.SignOutAsync();
            return Results.Ok(new { Message = "Logged out successfully" });
        });

        // ✅ Reset Password
        identityRoutes.MapPost("/reset-password", async ([FromBody] ResetPasswordModel model, UserManager<User> userManager) =>
        {
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null) return Results.BadRequest("Invalid email");

            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, resetToken, model.NewPassword);

            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            return Results.Ok(new { Message = "Password reset successful" });
        });

        // ✅ Update User Profile
        identityRoutes.MapPut("/update-profile/{userId}", async (string userId, [FromBody] UpdateProfileModel model, UserManager<User> userManager) =>
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user == null) return Results.NotFound("User not found");

            user.Name = model.Name;
            user.UserName = model.UserName;
            user.Email = model.Email;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            return Results.Ok(new { Message = "User profile updated successfully" });
        });

        // ✅ Delete User Account
        identityRoutes.MapDelete("/delete/{userId}", async (string userId, UserManager<User> userManager) =>
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user == null) return Results.NotFound("User not found");

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
                return Results.BadRequest(result.Errors);

            return Results.Ok(new { Message = "User account deleted successfully" });
        });

        return identityRoutes;
    }
}