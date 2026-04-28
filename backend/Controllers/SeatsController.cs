using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeatsController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public SeatsController(MovieTicketContext context)
        {
            _context = context;
        }

        [HttpGet("showtime/{showtimeId}")]
        public async Task<IActionResult> GetSeatsForShowtime(int showtimeId)
        {
            // 1. Tìm suất chiếu để biết đang chiếu ở Phòng nào
            var showtime = await _context.Showtimes.FindAsync(showtimeId);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu");

            // 2. Lấy toàn bộ ghế của Phòng đó
            var allSeats = await _context.Seats
                .Where(s => s.RoomId == showtime.RoomId)
                .OrderBy(s => s.Row).ThenBy(s => s.Number)
                .ToListAsync();

            // 3. Tìm các ghế ĐÃ BỊ ĐẶT trong suất chiếu này
            // (Giả sử vé nằm trong bảng Tickets và liên kết với bảng Bookings)
            var bookedSeatIds = await _context.Tickets
                .Include(t => t.Booking)
                .Where(t => t.Booking != null && t.Booking.ShowtimeId == showtimeId)
                .Select(t => t.SeatId)
                .ToListAsync();

            // 4. Trả về danh sách ghế kèm trạng thái (Trống/Đã đặt)
            var result = allSeats.Select(s => new
            {
                id = s.Id,
                row = s.Row,
                number = s.Number,
                type = (int)s.Type, // 0: Normal, 1: VIP
                isBooked = bookedSeatIds.Contains(s.Id)
            }).ToList();

            return Ok(result);
        }
    }
}