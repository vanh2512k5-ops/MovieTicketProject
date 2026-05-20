using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using BCrypt.Net;
using Minio;
using Minio.DataModel.Args;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly MovieTicketContext _context;
        private readonly IConfiguration _config;

        public UsersController(MovieTicketContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // 1. ĐĂNG KÝ 
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest("Email này đã được sử dụng!");

            var newUser = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "User"
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đăng ký thành công!" });
        }

        // 2. ĐĂNG NHẬP 
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto request)
        {
            // Tìm user theo email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            // Sai email hoặc mật khẩu
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return BadRequest("Email hoặc mật khẩu không chính xác!");

            //  TẠO TOKEN 

            // Lấy khóa bí mật từ appsettings.json
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
            );

            // "Claims" = thông tin nhét vào bên trong token
            var claims = new[]
            {
                new Claim("id", user.Id.ToString()),       // ID của user
                new Claim("email", user.Email),            // Email
                new Claim(ClaimTypes.Role, user.Role),     // Quyền (User/Admin) — dùng ClaimTypes.Role để [Authorize(Roles)] hoạt động
            };

            // Tạo Access Token — hết hạn sau 60 phút
            var accessToken = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    double.Parse(_config["Jwt:ExpiresInMinutes"]!)
                ),
                signingCredentials: new SigningCredentials(
                    key, SecurityAlgorithms.HmacSha256
                )
            );

            // Tạo Refresh Token — hết hạn sau 7 ngày
            var refreshToken = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                expires: DateTime.UtcNow.AddDays(
                    double.Parse(_config["Jwt:RefreshTokenExpiresInDays"]!)
                ),
                signingCredentials: new SigningCredentials(
                    key, SecurityAlgorithms.HmacSha256
                )
            );

            // Chuyển token từ object sang chuỗi để gửi về
            var tokenHandler = new JwtSecurityTokenHandler();
            var accessTokenString = tokenHandler.WriteToken(accessToken);
            var refreshTokenString = tokenHandler.WriteToken(refreshToken);

            // TRẢ VỀ CÓ THÊM TOKEN
            return Ok(new
            {
                Message = "Đăng nhập thành công!",
                User = new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role,
                    user.AvatarUrl
                },
                AccessToken = accessTokenString,   // Token dùng hàng ngày (60 phút)
                RefreshToken = refreshTokenString  // Token để xin cái mới (7 ngày)
            });
        }

        // 3. LÀM MỚI TOKEN — Khi Access Token hết hạn
        [HttpPost("refresh-token")]
        public IActionResult RefreshToken([FromBody] RefreshTokenDto request)
        {
            try
            {
                // Kiểm tra Refresh Token có hợp lệ không
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);

                tokenHandler.ValidateToken(
                    request.RefreshToken,
                    new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ValidateIssuer = true,
                        ValidIssuer = _config["Jwt:Issuer"],
                        ValidateAudience = true,
                        ValidAudience = _config["Jwt:Audience"],
                        ValidateLifetime = true  // Kiểm tra hết hạn chưa
                    },
                    out SecurityToken validatedToken
                );

                // Refresh Token còn hợp lệ → Tạo Access Token mới
                var newAccessToken = new JwtSecurityToken(
                    issuer: _config["Jwt:Issuer"],
                    audience: _config["Jwt:Audience"],
                    expires: DateTime.UtcNow.AddMinutes(
                        double.Parse(_config["Jwt:ExpiresInMinutes"]!)
                    ),
                    signingCredentials: new SigningCredentials(
                        new SymmetricSecurityKey(key),
                        SecurityAlgorithms.HmacSha256
                    )
                );

                return Ok(new
                {
                    // Trả về Access Token mới
                    AccessToken = tokenHandler.WriteToken(newAccessToken)
                });
            }
            catch
            {
                // Refresh Token hết hạn hoặc không hợp lệ → bắt đăng nhập lại
                return Unauthorized(new { Message = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!" });
            }
        }

        // 3. API TẢI ẢNH ĐẠI DIỆN LÊN MINIO
        [Authorize]
        [HttpPost("{id}/upload-avatar")]
        public async Task<IActionResult> UploadAvatar(int id, IFormFile file)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { message = "Không tìm thấy tài khoản!" });

                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "Vui lòng chọn một bức ảnh hợp lệ!" });

                // Kiểm tra đuôi file
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                var extension = Path.GetExtension(file.FileName).ToLower();
                if (!allowedExtensions.Contains(extension))
                    return BadRequest(new { message = "Chỉ chấp nhận file ảnh (.jpg, .png, .jpeg, .gif)" });

                // Lấy cấu hình MinIO từ appsettings.json
                string endpoint = _config["Minio:Endpoint"] ?? "127.0.0.1:9000";
                string accessKey = _config["Minio:AccessKey"] ?? "minioadmin";
                string secretKey = _config["Minio:SecretKey"] ?? "minioadmin";
                string bucketName = _config["Minio:BucketName"] ?? "movietickets";

                // Khởi tạo MinioClient
                using var minioClient = new MinioClient()
                    .WithEndpoint(endpoint)
                    .WithCredentials(accessKey, secretKey)
                    .Build();

                // Tạo bucket nếu chưa có
                bool found = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucketName));
                if (!found)
                {
                    await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName));
                }

                // Tạo tên file độc nhất để không bị trùng
                string fileName = $"avatars/user_{id}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{extension}";

                // Đẩy ảnh lên MinIO
                using (var stream = file.OpenReadStream())
                {
                    var putObjectArgs = new PutObjectArgs()
                        .WithBucket(bucketName)
                        .WithObject(fileName)
                        .WithStreamData(stream)
                        .WithObjectSize(file.Length)
                        .WithContentType(file.ContentType);

                    await minioClient.PutObjectAsync(putObjectArgs);
                }

                // Cập nhật link vào Database 
                user.AvatarUrl = $"/{bucketName}/{fileName}";
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Cập nhật ảnh đại diện thành công!",
                    avatarUrl = user.AvatarUrl
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }
    }

    // Các lớp hỗ trợ nhận dữ liệu (DTO)
    public class UserRegisterDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserLoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
    // DTO MỚI — nhận Refresh Token từ frontend
    public class RefreshTokenDto
    {
        public string RefreshToken { get; set; } = string.Empty;
    }
}