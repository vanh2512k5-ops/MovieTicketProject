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
                .Include(s => s.Room)
                    .ThenInclude(r => r.Cinema) // Kéo thông tin Rạp chiếu ra
                .Where(s => s.MovieId == movieId && s.StartTime > DateTime.Now)
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            var groupedShowtimes = showtimes
                .Where(s => s.Room != null && s.Room.Cinema != null)
                .GroupBy(s => new { s.Room.Cinema.Id, s.Room.Cinema.Name })
                .Select(g => new
                {
                    cinemaId = g.Key.Id,
                    cinemaName = g.Key.Name,
                    schedules = g.Select(s => new
                    {
                        showtimeId = s.Id,
                        roomName = s.Room.Name,
                        startTime = s.StartTime,
                        basePrice = s.BasePrice
                    }).ToList()
                })
                .ToList();

            if (!groupedShowtimes.Any())
            {
                return NotFound("Chưa có lịch chiếu");
            }

            return Ok(groupedShowtimes);
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