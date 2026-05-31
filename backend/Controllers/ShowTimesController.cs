using Microsoft.AspNetCore.Authorization;
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
            var currentTime = DateTime.Now;
            var showtimes = await _context.Showtimes
                .Include(s => s.Room)
                    .ThenInclude(r => r.Cinema) // Kéo thông tin Rạp chiếu ra
                .Where(s => s.MovieId == movieId && s.StartTime > currentTime)
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
                        movieId = s.MovieId,
                        roomId = s.RoomId,
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

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateShowtime([FromBody] CreateShowtimeRequest request)
        {
            // KIỂM TRA PHÒNG CÓ ĐANG KHÓA CẢI TẠO KHÔNG
            var room = await _context.Rooms.FindAsync(request.RoomId);
            if (room != null && room.IsUnderRenovation)
            {
                return BadRequest($"Phòng chiếu này đang được khóa để chờ cải tạo sơ đồ ghế (từ {room.RenovationScheduledAt?.ToString("dd/MM/yyyy HH:mm")}). Không thể thêm suất chiếu mới vào lúc này!");
            }

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

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateShowtime(int id, [FromBody] CreateShowtimeRequest request)
        {
            var showtime = await _context.Showtimes.FindAsync(id);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu!");

            var hasBookings = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id);
            if (hasBookings) return BadRequest("Không thể sửa suất chiếu đã có người mua vé!");

            var isConflict = await _context.Showtimes.AnyAsync(s =>
                s.Id != id && s.RoomId == request.RoomId && s.StartTime == request.StartTime);
            if (isConflict) return BadRequest("Khung giờ này đã bị trùng với phim khác trong phòng!");

            showtime.MovieId = request.MovieId;
            showtime.RoomId = request.RoomId;
            showtime.StartTime = request.StartTime;
            showtime.BasePrice = request.BasePrice;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật suất chiếu thành công!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteShowtime(int id)
        {
            var showtime = await _context.Showtimes.FindAsync(id);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu!");

            var hasBookings = await _context.Bookings.AnyAsync(b => b.ShowtimeId == id);
            if (hasBookings) return BadRequest("Không thể xóa suất chiếu đã có người mua vé!");

            _context.Showtimes.Remove(showtime);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã xóa suất chiếu!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("room/{roomId}/all-future")]
        public async Task<IActionResult> DeleteAllFutureShowtimes(int roomId)
        {
            var currentTime = DateTime.Now;
            var futureShowtimes = await _context.Showtimes
                .Where(s => s.RoomId == roomId && s.StartTime > currentTime)
                .ToListAsync();

            if (!futureShowtimes.Any())
            {
                return Ok(new { Message = "Phòng chiếu này không có suất chiếu nào ở tương lai." });
            }

            var showtimeIds = futureShowtimes.Select(s => s.Id).ToList();
            var hasBookings = await _context.Bookings.AnyAsync(b => showtimeIds.Contains(b.ShowtimeId));
            
            if (hasBookings)
            {
                return BadRequest("Không thể xóa các suất chiếu này vì đã có khách hàng mua vé/đặt chỗ cho khung giờ này!");
            }

            _context.Showtimes.RemoveRange(futureShowtimes);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã xóa thành công {futureShowtimes.Count} suất chiếu tương lai của phòng này." });
        }
    }
}