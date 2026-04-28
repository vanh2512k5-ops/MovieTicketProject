using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using BCrypt.Net;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public UsersController(MovieTicketContext context)
        {
            _context = context;
        }

        // 1. ĐĂNG KÝ (Register)
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto request)
        {
            // Kiểm tra email đã tồn tại chưa
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest("Email này đã được sử dụng!");

            // Mã hóa mật khẩu trước khi lưu
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

            // Tạm thời trả về thông tin user
            return Ok(new
            {
                Message = "Đăng nhập thành công!",
                User = new { user.Id, user.FullName, user.Email, user.Role }
            });
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