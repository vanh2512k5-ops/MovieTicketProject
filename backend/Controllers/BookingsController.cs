using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public BookingsController(MovieTicketContext context)
        {
            _context = context;
        }

        public class CreateBookingRequest
        {
            public int UserId { get; set; }
            public int ShowtimeId { get; set; }
            public List<int> SeatIds { get; set; } = new List<int>();
        }

        // ==========================================
        // 1. API TẠO VÉ MỚI 
        // ==========================================
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            if (request.SeatIds == null || !request.SeatIds.Any())
                return BadRequest("Vui lòng chọn ít nhất 1 ghế.");

            var showtime = await _context.Showtimes.FindAsync(request.ShowtimeId);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu.");

            // Quét xem ghế đã có người đặt chưa
            var bookedSeats = await _context.Tickets
                .Include(t => t.Booking)
                .Where(t => t.Booking != null
                         && t.Booking.ShowtimeId == request.ShowtimeId
                         && request.SeatIds.Contains(t.SeatId)
                         && t.Booking.Status != "Cancelled")
                .Select(t => t.SeatId)
                .ToListAsync();

            if (bookedSeats.Any())
            {
                return BadRequest(new { Message = "Ghế đã có người đặt!", ConflictedSeatIds = bookedSeats });
            }

            var booking = new Booking
            {
                UserId = request.UserId,
                ShowtimeId = request.ShowtimeId,
                BookingDate = DateTime.UtcNow,
                TotalPrice = showtime.BasePrice * request.SeatIds.Count,
                Status = "Pending"
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            var tickets = request.SeatIds.Select(seatId => new Ticket
            {
                BookingId = booking.Id,
                SeatId = seatId,
                Price = showtime.BasePrice
            }).ToList();

            _context.Tickets.AddRange(tickets);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đặt vé thành công!", BookingId = booking.Id });
        }

        // ==========================================
        // 2. API LẤY DANH SÁCH VÉ CỦA TÔI 
        // ==========================================
        // GET: api/Bookings/user/5
        [Authorize]
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetMyBookings(int userId)
        {
            var bookings = await _context.Bookings
                // Nối các bảng để lấy đủ thông tin: Phim, Rạp, Phòng, Ghế
                .Include(b => b.Showtime).ThenInclude(s => s.Movie)
                .Include(b => b.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
                .Include(b => b.Tickets).ThenInclude(t => t.Seat)
                .Where(b => b.UserId == userId)
                .Select(b => new
                {
                    BookingId = b.Id,
                    MovieTitle = b.Showtime!.Movie!.Title,
                    PosterUrl = b.Showtime.Movie.PosterUrl,
                    CinemaName = b.Showtime.Room!.Cinema!.Name,
                    RoomName = b.Showtime.Room.Name,
                    ShowTime = b.Showtime.StartTime,
                    // Ghép RowName (A) và SeatNumber (1) thành tên ghế trực quan (A1)
                    Seats = b.Tickets.Select(t => t.Seat!.RowName + t.Seat!.SeatNumber.ToString()).ToList(),
                    Status = b.Status,
                    TotalPrice = b.TotalPrice
                })
                .OrderByDescending(b => b.ShowTime)
                .ToListAsync();

            if (!bookings.Any())
            {
                return NotFound(new { Message = "Bạn chưa có lịch sử đặt vé nào." });
            }

            return Ok(bookings);
        }
    }
}