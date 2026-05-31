using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models; // Đã sửa: Trỏ đúng vào thư mục Models của sếp

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CinemasController : ControllerBase
    {
        // Đã sửa: Đổi AppDbContext thành MovieTicketContext theo đúng máy sếp
        private readonly MovieTicketContext _context;

        public CinemasController(MovieTicketContext context)
        {
            _context = context;
        }

        // API lấy danh sách tất cả các rạp
        // GET: api/Cinemas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetCinemas()
        {
            var cinemas = await _context.Cinemas
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Address,
                    RoomCount = c.Rooms.Count // Đếm số lượng phòng chiếu
                })
                .ToListAsync();

            return Ok(cinemas);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateCinema([FromBody] Cinema cinema)
        {
            _context.Cinemas.Add(cinema);
            await _context.SaveChangesAsync();

            // Tự động tạo 3 phòng chiếu mặc định cho Rạp mới
            for (int i = 1; i <= 3; i++)
            {
                _context.Rooms.Add(new Room
                {
                    CinemaId = cinema.Id,
                    Name = $"Phòng {i}",
                    Type = RoomType.Regular,
                    TotalRows = 10,
                    TotalColumns = 10,
                    IsLayoutConfigured = false
                });
            }
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Thêm rạp thành công (Đã tự động tạo 3 phòng chiếu)!", Cinema = cinema });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCinema(int id, [FromBody] Cinema updatedCinema)
        {
            if (id != updatedCinema.Id) return BadRequest("ID rạp không khớp");

            var cinema = await _context.Cinemas.FindAsync(id);
            if (cinema == null) return NotFound("Không tìm thấy rạp!");

            cinema.Name = updatedCinema.Name;
            cinema.Address = updatedCinema.Address;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật rạp thành công!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCinema(int id)
        {
            var cinema = await _context.Cinemas.FindAsync(id);
            if (cinema == null) return NotFound("Không tìm thấy rạp!");

            var hasRooms = await _context.Rooms.AnyAsync(r => r.CinemaId == id);
            if (hasRooms) return BadRequest("Không thể xóa rạp này vì rạp đã có phòng chiếu!");

            _context.Cinemas.Remove(cinema);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã xóa rạp thành công!" });
        }
    }
}