using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.models;
using quest4dealsweb.Server.Endpoints;

var builder = WebApplication.CreateBuilder(args);

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
    options.LoginPath = "/api/auth/login";  // Redirect to API login
    options.AccessDeniedPath = "/api/auth/access-denied"; // Redirect on unauthorized access
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
    options.SlidingExpiration = true;
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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