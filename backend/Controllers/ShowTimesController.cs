using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShowtimesController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public ShowtimesController(MovieTicketContext context)
        {
            _context = context;
        }

        [HttpGet("movie/{movieId}")]
        public async Task<IActionResult> GetShowtimes(int movieId)
        {
            var showtimes = await _context.Showtimes
                .Where(s => s.MovieId == movieId && s.StartTime > DateTime.UtcNow)
                .OrderBy(s => s.StartTime)
                .ToListAsync();
            return Ok(showtimes);
        }

        public class CreateShowtimeRequest
        {
            public int MovieId { get; set; }
            public int RoomId { get; set; }
            public DateTime StartTime { get; set; }
            public decimal BasePrice { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> CreateShowtime([FromBody] CreateShowtimeRequest request)
        {
            // Chống trùng lịch phòng chiếu
            var isConflict = await _context.Showtimes.AnyAsync(s =>
                s.RoomId == request.RoomId && s.StartTime == request.StartTime);

            if (isConflict)
                return BadRequest("Phòng chiếu này đã có phim khác chiếu vào khung giờ này!");

            var showtime = new Showtime
            {
                MovieId = request.MovieId,
                RoomId = request.RoomId,
                StartTime = request.StartTime,
                BasePrice = request.BasePrice
            };

            _context.Showtimes.Add(showtime);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Tạo lịch chiếu thành công!", ShowtimeId = showtime.Id });
        }
    }
}