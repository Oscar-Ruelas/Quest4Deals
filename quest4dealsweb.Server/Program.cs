using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using quest4dealsweb.Server.Endpoints;
using quest4dealsweb.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// CORS: Allow Vite frontend with credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteFrontend",
        policy =>
        {
            policy.WithOrigins("https://localhost:51540") // Vite dev server
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
});

builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();



// HttpClient for Nexarda API
builder.Services.AddHttpClient("NexardaClient", client =>
{
    client.BaseAddress = new Uri("https://www.nexarda.com/api/v3/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

builder.Services.AddMemoryCache();

// Database connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("The ConnectionString property has not been initialized. Check appsettings.json.");
}
builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(connectionString));

// Identity configuration
builder.Services.AddIdentity<User, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<DataContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// Cookie authentication configuration
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/api/auth/login";
    options.AccessDeniedPath = "/api/auth/access-denied";
    options.Cookie.Name = ".Quest4Deals.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax; // Lax is usually best for SPA+API
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
    options.SlidingExpiration = true;
    options.Events = new Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationEvents
    {
        OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = 401;
            return Task.CompletedTask;
        },
        OnSigningIn = async context =>
        {
            var rememberMe = context.Properties.IsPersistent;
            if (!rememberMe)
            {
                context.CookieOptions.Expires = null;
            }
            else
            {
                context.CookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(7);
            }
            await Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<PriceHistoryService>();
builder.Services.AddScoped<quest4dealsweb.Server.Services.PriceHistoryService>();
builder.Services.AddScoped<NotificationService>();

var app = builder.Build();

app.UseCors("AllowViteFrontend");
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapIdentityRoutes();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();