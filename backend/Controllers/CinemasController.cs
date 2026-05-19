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
    }
}