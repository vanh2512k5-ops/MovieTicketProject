using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using MovieTicketAPI.Services; // Thêm dòng này để nhận diện thư mục Services
using Minio;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình CORS - Cho phép mọi nguồn truy cập
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Cấu hình Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<MovieTicketContext>(options =>
    options.UseSqlServer(connectionString));

// Cấu hình MinIO
builder.Services.AddSingleton<IMinioClient>(sp =>
{
    var config = builder.Configuration.GetSection("Minio");
    return new MinioClient()
        .WithEndpoint(config["Endpoint"])
        .WithCredentials(config["AccessKey"], config["SecretKey"])
        .WithSSL(false)
        .Build();
});

// Đăng ký IMovieService để hệ thống có thể sử dụng logic tính toán Rating
builder.Services.AddScoped<IMovieService, MovieService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Hiển thị giao diện Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 2. Kích hoạt CORS 
app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.MapControllers();

app.Run();