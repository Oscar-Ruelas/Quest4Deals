using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using quest4dealsweb.Server.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteFrontend",
        policy =>
        {
            policy.WithOrigins("https://localhost:51540") // ✅ Vite dev server
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials(); // ✅ Required for authentication cookies
        });
});

// Add HttpClient services with named client for Nexarda
builder.Services.AddHttpClient("NexardaClient", client =>
{
    client.BaseAddress = new Uri("https://www.nexarda.com/api/v3/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

builder.Services.AddMemoryCache();

// ✅ Get connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("The ConnectionString property has not been initialized. Check appsettings.json.");
}

// ✅ Register DbContext with SQL Server
builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(connectionString));

// ✅ Configure Identity with Cookie Authentication (DO NOT manually add .AddCookie())
builder.Services.AddIdentity<User, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<DataContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// ✅ Configure Cookie Authentication (NO NEED to call `AddAuthentication().AddCookie()`)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/api/auth/login";  
    options.AccessDeniedPath = "/api/auth/access-denied";
    
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60); // Default session timeout
    options.SlidingExpiration = true;

    options.Events = new Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationEvents
    {
        OnSigningIn = async context =>
        {
            var rememberMe = context.Properties.IsPersistent;
            if (!rememberMe)
            {
                // ✅ Set session cookie (cleared when browser is closed)
                context.CookieOptions.Expires = null;
            }
            else
            {
                // ✅ Set persistent cookie (remembered after browser close)
                context.CookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(7); // Or any duration
            }

            await Task.CompletedTask;
        }
    };
});


builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors("AllowViteFrontend");

app.UseDefaultFiles();
app.UseStaticFiles();

// ✅ Enable Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapIdentityRoutes();  // ✅ Calls custom Identity endpoints

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();