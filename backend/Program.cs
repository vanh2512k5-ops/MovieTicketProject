using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using MovieTicketAPI.Services; // Thêm dòng này để nhận diện thư mục Services
using MovieTicketAPI.Middleware; // Thêm middleware
using Minio;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

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
builder.Services.AddScoped<IBookingService, BookingService>();

// Đăng ký Background Service tự động hủy Booking Pending quá hạn (chạy nền mỗi 1 phút)
builder.Services.AddHostedService<BookingExpiryService>();

// Đăng ký IHttpClientFactory (dùng để gọi Payment Gateway)
builder.Services.AddHttpClient();

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

// Kích hoạt Global Exception Middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseAuthentication(); // Xác thực: "mày là ai?"
app.UseAuthorization();  // Phân quyền: "mày được làm gì?"

app.MapControllers();



app.Run();