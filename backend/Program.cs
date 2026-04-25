using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<MovieTicketContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Kích hoạt Controller và Swagger (Thay cho OpenApi)
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); // [MỚI] Gọi thư viện vẽ giao diện Swagger

var app = builder.Build();

// 3. Hiển thị giao diện Swagger khi đang dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();   // [MỚI]
    app.UseSwaggerUI(); // [MỚI]
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();