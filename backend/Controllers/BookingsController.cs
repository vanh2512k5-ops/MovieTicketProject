using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MovieTicketAPI.Extensions;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private readonly MovieTicketContext _context;
        private readonly IConfiguration _config;
        private readonly HttpClient _http;

        public BookingsController(MovieTicketContext context, IConfiguration config, IHttpClientFactory httpFactory)
        {
            _context = context;
            _config  = config;
            _http    = httpFactory.CreateClient();
        }

        // ==========================================
        // HELPER: Tạo chữ ký HMAC-SHA256
        // ==========================================
        private string ComputeHmac(string data, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        // ==========================================
        // REQUEST / RESPONSE DTOs
        // ==========================================
        public class ComboRequest
        {
            public int ComboId { get; set; }
            public int Quantity { get; set; }
        }

        public class CreateBookingRequest
        {
            public int ShowtimeId { get; set; }
            public List<int> SeatIds { get; set; } = new List<int>();
            public List<ComboRequest> Combos { get; set; } = new List<ComboRequest>();
        }

        public class PaymentCallbackRequest
        {
            public string MerchantId { get; set; } = "";
            public string OrderId    { get; set; } = "";
            public string BillId     { get; set; } = "";
            public int Amount        { get; set; }
            public string Status     { get; set; } = "";
            public string Timestamp  { get; set; } = "";
        }

        // ==========================================
        // 1. API TẠO VÉ + GỌI CỔNG THANH TOÁN
        // ==========================================
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            if (request.SeatIds == null || !request.SeatIds.Any())
                return BadRequest("Vui lòng chọn ít nhất 1 ghế.");

            var showtime = await _context.Showtimes.FindAsync(request.ShowtimeId);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu.");

            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            int userId = currentUserId.Value;

            // XÓA BOOKING CŨ CỦA CHÍNH USER NÀY (TRẠNG THÁI PENDING) MÀ TRÙNG GHẾ ĐANG CHỌN (Tránh kẹt ghế do back lại)
            var oldPendingBookings = await _context.Bookings
                .Include(b => b.Tickets)
                .Where(b => b.UserId == userId && b.ShowtimeId == request.ShowtimeId && b.Status == "Pending")
                .ToListAsync();

            if (oldPendingBookings.Any())
            {
                var oldBookingsToRemove = oldPendingBookings.Where(b => b.Tickets.Any(t => request.SeatIds.Contains(t.SeatId))).ToList();
                if (oldBookingsToRemove.Any())
                {
                    _context.Bookings.RemoveRange(oldBookingsToRemove);
                    await _context.SaveChangesAsync();
                }
            }

            // Kiểm tra ghế đã bị đặt chưa (bởi người khác hoặc booking đã Paid)
            var bookedSeats = await _context.Tickets
                .Include(t => t.Booking)
                .Where(t => t.Booking != null
                         && t.Booking.ShowtimeId == request.ShowtimeId
                         && request.SeatIds.Contains(t.SeatId)
                         && t.Booking.Status != "Cancelled")
                .Select(t => t.SeatId)
                .ToListAsync();

            if (bookedSeats.Any())
                return BadRequest(new { Message = "Ghế đã có người đặt!", ConflictedSeatIds = bookedSeats });

            // Load cấu hình phụ thu
            var activeRules = await _context.PricingRules.Where(r => r.IsActive).ToListAsync();

            // Lấy danh sách ghế đang chọn để tính tiền và lấy loại ghế
            var selectedSeats = await _context.Seats
                .Where(s => request.SeatIds.Contains(s.Id))
                .ToListAsync();

            decimal totalSeatPrice = 0;
            var tickets = new List<Ticket>();
            decimal basePrice = showtime.BasePrice > 0 ? showtime.BasePrice : 85000; // Fallback nếu dữ liệu cũ chưa có BasePrice

            foreach (var seat in selectedSeats)
            {
                decimal currentSeatPrice = basePrice;
                var priceDetails = new Dictionary<string, decimal> { { "BasePrice", basePrice } };

                // Phụ thu theo loại ghế
                var seatRule = activeRules.FirstOrDefault(r => r.RuleType == "SeatType" && r.RuleKey == seat.Type.ToString());
                if (seatRule != null)
                {
                    currentSeatPrice += seatRule.SurchargeAmount;
                    priceDetails.Add($"Surcharge_{seat.Type}", seatRule.SurchargeAmount);
                }

                totalSeatPrice += currentSeatPrice;
                tickets.Add(new Ticket
                {
                    SeatId = seat.Id,
                    Price = currentSeatPrice,
                    PriceDetails = JsonSerializer.Serialize(priceDetails)
                });
            }

            // Tính tiền combo
            decimal totalComboPrice = 0;
            var combosToSave = new List<BookingCombo>();
            if (request.Combos != null && request.Combos.Any())
            {
                var comboIds = request.Combos.Select(c => c.ComboId).ToList();
                var combosDb = await _context.Combos.Where(c => comboIds.Contains(c.Id)).ToListAsync();
                foreach (var req in request.Combos.Where(c => c.Quantity > 0))
                {
                    var comboDb = combosDb.FirstOrDefault(c => c.Id == req.ComboId);
                    if (comboDb != null)
                    {
                        totalComboPrice += comboDb.Price * req.Quantity;
                        combosToSave.Add(new BookingCombo
                        {
                            ComboId  = req.ComboId,
                            Quantity = req.Quantity,
                            Price    = comboDb.Price
                        });
                    }
                }
            }

            // Lưu booking vào DB (Status = Pending)
            var booking = new Booking
            {
                UserId      = userId,
                ShowtimeId  = request.ShowtimeId,
                BookingDate = DateTime.UtcNow,
                TotalPrice  = totalSeatPrice + totalComboPrice,
                Status      = "Pending"
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            // Gán booking id vào các tickets
            foreach (var t in tickets) t.BookingId = booking.Id;
            _context.Tickets.AddRange(tickets);
            await _context.SaveChangesAsync();

            if (combosToSave.Any())
            {
                foreach (var bc in combosToSave) bc.BookingId = booking.Id;
                _context.BookingCombos.AddRange(combosToSave);
                await _context.SaveChangesAsync();
            }

            // ─────────────────────────────────────────
            // Gọi Payment Gateway để tạo bill & lấy QR
            // ─────────────────────────────────────────
            var gwBaseUrl    = _config["PaymentGateway:BaseUrl"]!;
            var merchantId   = _config["PaymentGateway:MerchantId"]!;
            var secretKey    = _config["PaymentGateway:SecretKey"]!;
            var callbackUrl  = _config["PaymentGateway:CallbackUrl"]!;

            var orderId   = booking.Id.ToString();
            var amountInt = (int)Math.Round(booking.TotalPrice);
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            // Tạo chữ ký HMAC gửi lên Gateway
            var signatureData = $"{merchantId}|{orderId}|{amountInt}|{timestamp}";
            var signature     = ComputeHmac(signatureData, secretKey);

            var gwPayload = new
            {
                merchantId,
                orderId,
                amount = amountInt,
                timestamp,
                callbackUrl
            };

            string qrUrl;
            try
            {
                var gwRequest = new HttpRequestMessage(HttpMethod.Post, $"{gwBaseUrl}/bill/create")
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(gwPayload),
                        Encoding.UTF8,
                        "application/json")
                };
                gwRequest.Headers.Add("X-Signature", signature);

                var gwResponse = await _http.SendAsync(gwRequest);
                if (!gwResponse.IsSuccessStatusCode)
                {
                    // Nếu gọi Gateway thất bại, xoá booking để nhả lại ghế
                    _context.Bookings.Remove(booking);
                    await _context.SaveChangesAsync();

                    var errBody = await gwResponse.Content.ReadAsStringAsync();
                    return StatusCode(502, new { Message = "Cổng thanh toán từ chối yêu cầu.", Detail = errBody });
                }

                var gwJson = await gwResponse.Content.ReadFromJsonAsync<JsonElement>();
                var billId     = gwJson.GetProperty("billId").GetString()!;
                var bankId     = gwJson.GetProperty("bankId").GetString()!;
                var bankAccount= gwJson.GetProperty("bankAccount").GetString()!;
                var accountName= gwJson.GetProperty("accountName").GetString()!;

                // Lưu billId vào booking
                booking.BillId = billId;
                await _context.SaveChangesAsync();

                // Tạo VietQR Quick Link
                var addInfo   = Uri.EscapeDataString($"Thanh toan ve #{orderId}");
                qrUrl = $"https://img.vietqr.io/image/{bankId}-{bankAccount}-compact2.png" +
                        $"?amount={amountInt}&addInfo={addInfo}&accountName={Uri.EscapeDataString(accountName)}";
            }
            catch (Exception ex)
            {
                // Nếu Gateway chưa chạy → vẫn trả booking, báo lỗi QR
                Console.WriteLine($"[BE] ⚠️  Không kết nối được Gateway: {ex.Message}");
                return Ok(new
                {
                    Message   = "Đặt vé thành công nhưng không tạo được QR (Gateway chưa chạy).",
                    BookingId = booking.Id,
                    QrUrl     = (string?)null
                });
            }

            return Ok(new
            {
                Message   = "Đặt vé thành công!",
                BookingId = booking.Id,
                QrUrl     = qrUrl
            });
        }

        // ==========================================
        // 2. CALLBACK từ Payment Gateway
        // ==========================================
        [HttpPost("payment-callback")]
        public async Task<IActionResult> PaymentCallback([FromBody] PaymentCallbackRequest body)
        {
            var secretKey = _config["PaymentGateway:SecretKey"]!;

            // Lấy chữ ký từ header
            var receivedSig = Request.Headers["X-Signature"].ToString();

            // Xây lại chuỗi ký để kiểm tra
            var expectedData = $"{body.MerchantId}|{body.OrderId}|{body.BillId}|{body.Amount}|SUCCESS|{body.Timestamp}";
            var expectedSig  = ComputeHmac(expectedData, secretKey);

            if (expectedSig != receivedSig)
            {
                Console.WriteLine("[BE] ❌ Chữ ký callback không hợp lệ!");
                return Unauthorized(new { Message = "Chữ ký không hợp lệ." });
            }

            if (body.Status != "SUCCESS")
                return BadRequest(new { Message = "Trạng thái không phải SUCCESS." });

            // Tìm booking theo orderId
            if (!int.TryParse(body.OrderId, out int bookingId))
                return BadRequest(new { Message = "OrderId không hợp lệ." });

            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
                return NotFound(new { Message = "Không tìm thấy booking." });

            // Cập nhật trạng thái
            booking.Status = "Paid";
            await _context.SaveChangesAsync();

            Console.WriteLine($"[BE] ✅ Booking #{bookingId} đã được thanh toán thành công.");
            return Ok(new { Message = "Cập nhật trạng thái thành công." });
        }

        // ==========================================
        // 3. POLLING: Kiểm tra trạng thái booking
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
        // 4. API LẤY DANH SÁCH VÉ CỦA TÔI
        // ==========================================
        [Authorize]
        [HttpGet("my-bookings")]
        public async Task<IActionResult> GetMyBookings()
        {
            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            int userId = currentUserId.Value;

            var bookings = await _context.Bookings
                .Include(b => b.Showtime).ThenInclude(s => s.Movie)
                .Include(b => b.Showtime).ThenInclude(s => s.Room).ThenInclude(r => r.Cinema)
                .Include(b => b.Tickets).ThenInclude(t => t.Seat)
                .Include(b => b.BookingCombos).ThenInclude(bc => bc.Combo)
                .Where(b => b.UserId == userId)
                .Select(b => new
                {
                    BookingId  = b.Id,
                    MovieTitle = b.Showtime!.Movie!.Title,
                    PosterUrl  = b.Showtime.Movie.PosterUrl,
                    CinemaName = b.Showtime.Room!.Cinema!.Name,
                    RoomName   = b.Showtime.Room.Name,
                    ShowTime   = b.Showtime.StartTime,
                    Seats      = b.Tickets.Select(t => t.Seat!.RowName + t.Seat!.SeatNumber.ToString()).ToList(),
                    Combos     = b.BookingCombos.Select(bc => new { Name = bc.Combo!.Name, Quantity = bc.Quantity, Price = bc.Price }).ToList(),
                    Status     = b.Status,
                    TotalPrice = b.TotalPrice
                })
                .OrderByDescending(b => b.ShowTime)
                .ToListAsync();

            if (!bookings.Any())
                return NotFound(new { Message = "Bạn chưa có lịch sử đặt vé nào." });

            return Ok(bookings);
        }
    }
}