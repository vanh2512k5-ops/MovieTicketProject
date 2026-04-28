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
    }
}