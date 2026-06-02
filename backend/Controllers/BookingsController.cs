using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using MovieTicketAPI.Extensions;
using MovieTicketAPI.Services;
using MovieTicketAPI.Constants;
using MovieTicketAPI.DTOs;
using System.Linq;
using System;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private readonly MovieTicketContext _context;
        private readonly IConfiguration _config;
        private readonly IBookingService _bookingService;

        public BookingsController(MovieTicketContext context, IConfiguration config, IBookingService bookingService)
        {
            _context = context;
            _config  = config;
            _bookingService = bookingService;
        }

        private string ComputeHmac(string data, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        // ==========================================
        // 1. API GIỮ GHẾ (HOLD SEATS)
        // ==========================================
        [Authorize]
        [HttpPost("hold")]
        public async Task<IActionResult> HoldSeats([FromBody] CreateBookingRequest request)
        {
            if (request.SeatIds == null || !request.SeatIds.Any())
                return BadRequest("Vui lòng chọn ít nhất 1 ghế.");

            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            
            var result = await _bookingService.HoldSeatsAsync(currentUserId.Value, request.ShowtimeId, request.SeatIds);
            
            if (!result.Success)
            {
                if (result.ConflictedSeats != null)
                    return BadRequest(new { Message = result.Message, ConflictedSeatIds = result.ConflictedSeats });
                
                return BadRequest(new { Message = result.Message });
            }

            return Ok(new { Message = result.Message, BookingId = result.BookingId });
        }

        // ==========================================
        // 2. API TẠO VÉ CHÍNH THỨC + GỌI CỔNG THANH TOÁN
        // ==========================================
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            if (request.SeatIds == null || !request.SeatIds.Any())
                return BadRequest("Vui lòng chọn ít nhất 1 ghế.");

            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            
            var result = await _bookingService.CreateBookingAsync(currentUserId.Value, request.ShowtimeId, request.SeatIds, request.Combos);

            if (!result.Success)
            {
                if (result.ConflictedSeats != null)
                    return BadRequest(new { Message = result.Message, ConflictedSeatIds = result.ConflictedSeats });
                
                return BadRequest(new { Message = result.Message });
            }

            return Ok(new
            {
                Message   = result.Message,
                BookingId = result.BookingId,
                QrUrl     = result.QrUrl
            });
        }

        // ==========================================
        // 3. CALLBACK từ Payment Gateway
        // ==========================================
        [HttpPost("payment-callback")]
        public async Task<IActionResult> PaymentCallback([FromBody] PaymentCallbackRequest body)
        {
            var secretKey = _config["PaymentGateway:SecretKey"]!;

            var receivedSig = Request.Headers["X-Signature"].ToString();
            var expectedData = $"{body.MerchantId}|{body.OrderId}|{body.BillId}|{body.Amount}|SUCCESS|{body.Timestamp}";
            var expectedSig  = ComputeHmac(expectedData, secretKey);

            if (expectedSig != receivedSig)
            {
                Console.WriteLine("[BE] ❌ Chữ ký callback không hợp lệ!");
                return Unauthorized(new { Message = "Chữ ký không hợp lệ." });
            }

            if (body.Status != "SUCCESS")
                return BadRequest(new { Message = "Trạng thái không phải SUCCESS." });

            if (!int.TryParse(body.OrderId, out int bookingId))
                return BadRequest(new { Message = "OrderId không hợp lệ." });

            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
                return NotFound(new { Message = "Không tìm thấy booking." });

            booking.Status    = BookingStatus.Paid;
            booking.ExpiresAt = null;
            await _context.SaveChangesAsync();

            Console.WriteLine($"[BE] ✅ Booking #{bookingId} đã được thanh toán thành công.");
            return Ok(new { Message = "Cập nhật trạng thái thành công." });
        }

        // ==========================================
        // 4. POLLING: Kiểm tra trạng thái booking
        // ==========================================
        [Authorize]
        [HttpGet("{id}/status")]
        public async Task<IActionResult> GetBookingStatus(int id)
        {
            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized();

            var booking = await _context.Bookings
                .Where(b => b.Id == id && b.UserId == currentUserId.Value)
                .Select(b => new { b.Id, b.Status, b.BillId })
                .FirstOrDefaultAsync();

            if (booking == null) return NotFound();

            return Ok(booking);
        }

        // ==========================================
        // 5. API LẤY DANH SÁCH VÉ CỦA TÔI
        // ==========================================
        [Authorize]
        [HttpGet("my-bookings")]
        public async Task<IActionResult> GetMyBookings()
        {
            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            int userId = currentUserId.Value;

            var rawBookings = await _context.Bookings
                .Include(b => b.Showtime).ThenInclude(s => s.Movie)
                .Include(b => b.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
                .Include(b => b.Tickets).ThenInclude(t => t.Seat)
                .Include(b => b.BookingCombos).ThenInclude(bc => bc.Combo)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.Showtime!.StartTime)
                .ToListAsync();

            if (!rawBookings.Any())
                return NotFound(new { Message = "Bạn chưa có lịch sử đặt vé nào." });

            var bookings = rawBookings.Select(b => new
            {
                BookingId  = b.Id,
                MovieTitle = b.Showtime!.Movie!.Title,
                PosterUrl  = b.Showtime.Movie.PosterUrl,
                CinemaName = b.Showtime.Room!.Cinema!.Name,
                RoomName   = b.Showtime.Room.Name,
                ShowTime   = b.Showtime.StartTime,
                Seats      = b.Tickets.SelectMany(t =>
                {
                    var label = (t.Seat?.RowName ?? "") + t.Seat?.SeatNumber.ToString();
                    if (t.Seat?.Type == SeatType.Couple)
                        return new[] { label, (t.Seat.RowName ?? "") + (t.Seat.SeatNumber + 1).ToString() };
                    return new[] { label };
                }).ToList(),
                Combos     = b.BookingCombos.Select(bc => new { Name = bc.Combo!.Name, Quantity = bc.Quantity, Price = bc.Price }).ToList(),
                Status     = b.Status,
                TotalPrice = b.TotalPrice
            }).ToList();

            return Ok(bookings);
        }

        // ==========================================
        // 6. HỦY VÉ (Dành cho User)
        // ==========================================
        [Authorize]
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized();

            var result = await _bookingService.CancelBookingAsync(currentUserId.Value, id);
            
            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(new { Message = result.Message });
        }

        // ==========================================
        // 7. THỐNG KÊ ADMIN DASHBOARD
        // ==========================================
        [Authorize(Roles = "Admin")]
        [HttpGet("admin-stats")]
        public async Task<IActionResult> GetAdminStats()
        {
            var today = DateTime.UtcNow.Date;
            var allPaidBookings = await _context.Bookings
                .Include(b => b.Showtime).ThenInclude(s => s.Movie)
                .Where(b => b.Status == BookingStatus.Paid)
                .ToListAsync();

            var topMovies = allPaidBookings
                .GroupBy(b => b.Showtime?.Movie?.Title ?? "Không xác định")
                .OrderByDescending(g => g.Count())
                .Take(3)
                .Select(g => new { movieTitle = g.Key, ticketCount = g.Count() })
                .ToList();

            return Ok(new
            {
                totalBookings = allPaidBookings.Count,
                totalRevenue  = allPaidBookings.Sum(b => b.TotalPrice),
                bookingsToday = allPaidBookings.Count(b => b.BookingDate.Date == today),
                revenueToday  = allPaidBookings.Where(b => b.BookingDate.Date == today).Sum(b => b.TotalPrice),
                topMovies
            });
        }
    }
}