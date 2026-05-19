using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using BCrypt.Net;
using Minio;
using Minio.DataModel.Args;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly MovieTicketContext _context;
        private readonly IConfiguration _config; // Thêm Config để đọc thông tin MinIO

        public UsersController(MovieTicketContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // 1. ĐĂNG KÝ (Register)
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto request)
        {
            // Kiểm tra email đã tồn tại chưa
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest("Email này đã được sử dụng!");

            // Mã hóa mật khẩu và CỐ ĐỊNH quyền là "User"
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

        // 2. ĐĂNG NHẬP (Login)
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Email hoặc mật khẩu không chính xác!");
            }

            // Tạm thời trả về thông tin user (BỔ SUNG AvatarUrl để App load ảnh ngay lúc login)
            return Ok(new
            {
                Message = "Đăng nhập thành công!",
                User = new { user.Id, user.FullName, user.Email, user.Role, user.AvatarUrl }
            });
        }

        // 3. API TẢI ẢNH ĐẠI DIỆN LÊN MINIO
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
                // Cấu trúc URL chuẩn: http://[endpoint]/[bucketName]/[fileName]
                string minioUrl = $"http://{endpoint}/{bucketName}/{fileName}";
                user.AvatarUrl = minioUrl;
                await _context.SaveChangesAsync();

                return Ok(new { 
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
}