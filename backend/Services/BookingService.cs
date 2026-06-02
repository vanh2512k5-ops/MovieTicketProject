using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MovieTicketAPI.Constants;
using MovieTicketAPI.DTOs;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Services
{
    public class BookingService : IBookingService
    {
        private readonly MovieTicketContext _context;
        private readonly IConfiguration _config;
        private readonly HttpClient _http;

        public BookingService(MovieTicketContext context, IConfiguration config, IHttpClientFactory httpFactory)
        {
            _context = context;
            _config = config;
            _http = httpFactory.CreateClient();
        }

        private string ComputeHmac(string data, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        public async Task<(bool Success, string Message, int? BookingId, List<int>? ConflictedSeats)> HoldSeatsAsync(int userId, int showtimeId, List<int> seatIds)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // XÓA BOOKING CŨ CỦA CHÍNH USER NÀY (TRẠNG THÁI PENDING) MÀ TRÙNG GHẾ ĐANG CHỌN
                var oldPendingBookings = await _context.Bookings
                    .Include(b => b.Tickets)
                    .Where(b => b.UserId == userId && b.ShowtimeId == showtimeId && b.Status == BookingStatus.Pending)
                    .ToListAsync();

                if (oldPendingBookings.Any())
                {
                    _context.Bookings.RemoveRange(oldPendingBookings);
                    await _context.SaveChangesAsync();
                }

                // Kiểm tra ghế đã bị đặt chưa
                var bookedSeats = await _context.Tickets
                    .Include(t => t.Booking)
                    .Where(t => t.Booking != null
                             && t.Booking.ShowtimeId == showtimeId
                             && seatIds.Contains(t.SeatId)
                             && t.Booking.Status != BookingStatus.Cancelled)
                    .Select(t => t.SeatId)
                    .ToListAsync();

                if (bookedSeats.Any())
                {
                    await transaction.RollbackAsync();
                    return (false, "Rất tiếc, ghế bạn chọn vừa có người khác nhanh tay đặt mất rồi!", null, bookedSeats);
                }

                // Lưu booking tạm (Hold)
                var booking = new Booking
                {
                    UserId      = userId,
                    ShowtimeId  = showtimeId,
                    BookingDate = DateTime.UtcNow,
                    TotalPrice  = 0,
                    Status      = BookingStatus.Pending,
                    ExpiresAt   = DateTime.UtcNow.AddMinutes(10)
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                var tickets = seatIds.Select(seatId => new Ticket
                {
                    SeatId = seatId,
                    Price = 0,
                    PriceDetails = "{}",
                    BookingId = booking.Id
                }).ToList();

                _context.Tickets.AddRange(tickets);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return (true, "Giữ ghế thành công", booking.Id, null);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<(bool Success, string Message, int? BookingId, decimal TotalPrice, string? QrUrl, List<int>? ConflictedSeats)> CreateBookingAsync(int userId, int showtimeId, List<int> seatIds, List<ComboRequest> combos)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            Booking booking = null;
            try
            {
                var showtime = await _context.Showtimes.Include(s => s.Room).FirstOrDefaultAsync(s => s.Id == showtimeId);
                if (showtime == null)
                    return (false, "Không tìm thấy suất chiếu.", null, 0, null, null);

                var oldPendingBookings = await _context.Bookings
                    .Include(b => b.Tickets)
                    .Where(b => b.UserId == userId && b.ShowtimeId == showtimeId && b.Status == BookingStatus.Pending)
                    .ToListAsync();

                if (oldPendingBookings.Any())
                {
                    _context.Bookings.RemoveRange(oldPendingBookings);
                    await _context.SaveChangesAsync();
                }

                var bookedSeats = await _context.Tickets
                    .Include(t => t.Booking)
                    .Where(t => t.Booking != null
                             && t.Booking.ShowtimeId == showtimeId
                             && seatIds.Contains(t.SeatId)
                             && t.Booking.Status != BookingStatus.Cancelled)
                    .Select(t => t.SeatId)
                    .ToListAsync();

                if (bookedSeats.Any())
                {
                    await transaction.RollbackAsync();
                    return (false, "Ghế đã có người đặt!", null, 0, null, bookedSeats);
                }

                var activeRules = await _context.PricingRules.Where(r => r.IsActive).ToListAsync();
                var selectedSeats = await _context.Seats.Where(s => seatIds.Contains(s.Id)).ToListAsync();

                decimal totalSeatPrice = 0;
                var tickets = new List<Ticket>();
                decimal basePrice = showtime.BasePrice > 0 ? showtime.BasePrice : 85000;

                var formatRule = showtime.Room != null ? activeRules.FirstOrDefault(r => r.RuleType == PricingRuleType.Format && r.RuleKey == showtime.Room.Type.ToString()) : null;
                bool isWeekend = showtime.StartTime.DayOfWeek == DayOfWeek.Saturday || showtime.StartTime.DayOfWeek == DayOfWeek.Sunday;
                var weekendRule = isWeekend ? activeRules.FirstOrDefault(r => r.RuleType == PricingRuleType.TimeFrame && r.RuleKey == PricingRuleKey.Weekend) : null;
                var morningRule = showtime.StartTime.Hour < 12 ? activeRules.FirstOrDefault(r => r.RuleType == PricingRuleType.TimeFrame && r.RuleKey == PricingRuleKey.Morning) : null;
                var eveningRule = showtime.StartTime.Hour >= 18 ? activeRules.FirstOrDefault(r => r.RuleType == PricingRuleType.TimeFrame && r.RuleKey == PricingRuleKey.Evening) : null;

                foreach (var seat in selectedSeats)
                {
                    decimal currentSeatPrice = basePrice;
                    var priceDetails = new Dictionary<string, decimal> { { "BasePrice", basePrice } };

                    if (formatRule != null)
                    {
                        currentSeatPrice += formatRule.SurchargeAmount;
                        priceDetails.Add($"{PricingRuleType.Format}_{showtime.Room.Type}", formatRule.SurchargeAmount);
                    }
                    if (weekendRule != null)
                    {
                        currentSeatPrice += weekendRule.SurchargeAmount;
                        priceDetails.Add($"{PricingRuleType.TimeFrame}_{PricingRuleKey.Weekend}", weekendRule.SurchargeAmount);
                    }
                    if (morningRule != null)
                    {
                        currentSeatPrice += morningRule.SurchargeAmount;
                        priceDetails.Add($"{PricingRuleType.TimeFrame}_{PricingRuleKey.Morning}", morningRule.SurchargeAmount);
                    }
                    else if (eveningRule != null)
                    {
                        currentSeatPrice += eveningRule.SurchargeAmount;
                        priceDetails.Add($"{PricingRuleType.TimeFrame}_{PricingRuleKey.Evening}", eveningRule.SurchargeAmount);
                    }

                    var seatRule = activeRules.FirstOrDefault(r => r.RuleType == PricingRuleType.SeatType && r.RuleKey == seat.Type.ToString());
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

                decimal totalComboPrice = 0;
                var combosToSave = new List<BookingCombo>();
                if (combos != null && combos.Any())
                {
                    var comboIds = combos.Select(c => c.ComboId).ToList();
                    var combosDb = await _context.Combos.Where(c => comboIds.Contains(c.Id)).ToListAsync();
                    foreach (var req in combos.Where(c => c.Quantity > 0))
                    {
                        var comboDb = combosDb.FirstOrDefault(c => c.Id == req.ComboId);
                        if (comboDb != null)
                        {
                            totalComboPrice += comboDb.Price * req.Quantity;
                            combosToSave.Add(new BookingCombo
                            {
                                ComboId = req.ComboId,
                                Quantity = req.Quantity,
                                Price = comboDb.Price
                            });
                        }
                    }
                }

                booking = new Booking
                {
                    UserId = userId,
                    ShowtimeId = showtimeId,
                    BookingDate = DateTime.UtcNow,
                    TotalPrice = totalSeatPrice + totalComboPrice,
                    Status = BookingStatus.Pending,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10)
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                foreach (var t in tickets) t.BookingId = booking.Id;
                _context.Tickets.AddRange(tickets);

                if (combosToSave.Any())
                {
                    foreach (var bc in combosToSave) bc.BookingId = booking.Id;
                    _context.BookingCombos.AddRange(combosToSave);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Gọi Payment Gateway để lấy QR
            var gwBaseUrl    = _config["PaymentGateway:BaseUrl"]!;
            var merchantId   = _config["PaymentGateway:MerchantId"]!;
            var secretKey    = _config["PaymentGateway:SecretKey"]!;
            var callbackUrl  = _config["PaymentGateway:CallbackUrl"]!;

            var orderId   = booking.Id.ToString();
            var amountInt = (int)Math.Round(booking.TotalPrice);
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

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

            string qrUrl = null;
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
                    return (false, $"Cổng thanh toán từ chối yêu cầu. {errBody}", null, 0, null, null);
                }

                var gwJson = await gwResponse.Content.ReadFromJsonAsync<JsonElement>();
                var billId     = gwJson.GetProperty("billId").GetString()!;
                var bankId     = gwJson.GetProperty("bankId").GetString()!;
                var bankAccount= gwJson.GetProperty("bankAccount").GetString()!;
                var accountName= gwJson.GetProperty("accountName").GetString()!;

                booking.BillId = billId;
                await _context.SaveChangesAsync();

                var addInfo   = Uri.EscapeDataString($"Thanh toan ve #{orderId}");
                qrUrl = $"https://img.vietqr.io/image/{bankId}-{bankAccount}-compact2.png" +
                        $"?amount={amountInt}&addInfo={addInfo}&accountName={Uri.EscapeDataString(accountName)}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BE] ⚠️  Không kết nối được Gateway: {ex.Message}");
                return (true, "Đặt vé thành công nhưng không tạo được QR (Gateway chưa chạy).", booking.Id, booking.TotalPrice, null, null);
            }

            return (true, "Đặt vé thành công!", booking.Id, booking.TotalPrice, qrUrl, null);
        }

        public async Task<(bool Success, string Message)> CancelBookingAsync(int userId, int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Showtime)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null) return (false, "Không tìm thấy vé.");
            if (booking.Showtime == null || booking.Showtime.StartTime <= DateTime.Now)
                return (false, "Không thể hủy vé của suất chiếu đã hoặc đang diễn ra.");
            if (booking.Status == BookingStatus.Cancelled)
                return (false, "Vé này đã được hủy trước đó.");

            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();

            return (true, "Đã hủy vé thành công.");
        }
    }
}
