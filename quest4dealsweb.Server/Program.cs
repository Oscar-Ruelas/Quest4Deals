using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using quest4dealsweb.Server.Data;
using quest4dealsweb.Server.Endpoints;
using quest4dealsweb.Server.models;

var builder = WebApplication.CreateBuilder(args);

// Get connection string from appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("The ConnectionString property has not been initialized. Check appsettings.json.");
}

Console.WriteLine($"Using Connection String: {connectionString}");

// Register DbContext with SQL Server
builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(connectionString));

// ✅ Fix: Register `TimeProvider` for Identity security stamp validation
builder.Services.AddSingleton(TimeProvider.System);

// ✅ Fix: Register `IDataProtectionProvider` for secure token handling
builder.Services.AddDataProtection();

// Configure Identity
builder.Services.AddIdentityCore<User>(options =>
    {
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<DataContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();  // ✅ Required for password reset & security features

// Add authentication and authorization
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Enable static files and authentication
app.UseDefaultFiles();
app.UseStaticFiles();

// ✅ Call Custom Identity API Endpoints
app.MapIdentityRoutes();  // 💡 Now it correctly calls the separate file!

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();
