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
            var showtime = await _context.Showtimes.Include(s => s.Room).FirstOrDefaultAsync(s => s.Id == showtimeId);
            if (showtime == null) return NotFound("Không tìm thấy suất chiếu");

            // 2. Lấy toàn bộ ghế của Phòng đó
            var allSeats = await _context.Seats
                .Where(s => s.RoomId == showtime.RoomId && !s.IsDeleted)
                .OrderBy(s => s.RowName).ThenBy(s => s.SeatNumber)
                .ToListAsync();

            // 3. Tìm các ghế ĐÃ BỊ ĐẶT (Paid hoặc Pending) trong suất chiếu này
            // Bỏ qua các ghế của booking đã bị Cancelled (hết hạn hoặc cố tình hủy)
            var bookedSeatIds = await _context.Tickets
                .Include(t => t.Booking)
                .Where(t => t.Booking != null 
                         && t.Booking.ShowtimeId == showtimeId 
                         && t.Booking.Status != "Cancelled")
                .Select(t => t.SeatId)
                .ToListAsync();

            // Lấy BasePrice
            decimal basePrice = showtime.BasePrice > 0 ? showtime.BasePrice : 85000;

            // Lấy Pricing Rules (Loại ghế, Định dạng, v.v...)
            var activeRules = await _context.PricingRules.Where(r => r.IsActive).ToListAsync();

            // Áp dụng phụ thu Format (IMAX, v.v...) vào basePrice chung
            if (showtime.Room != null)
            {
                var formatRule = activeRules.FirstOrDefault(r => r.RuleType == "Format" && r.RuleKey == showtime.Room.Type.ToString());
                if (formatRule != null)
                {
                    basePrice += formatRule.SurchargeAmount;
                }
            }

            // Áp dụng phụ thu Khung giờ (TimeFrame) vào basePrice chung
            bool isWeekend = showtime.StartTime.DayOfWeek == DayOfWeek.Saturday || showtime.StartTime.DayOfWeek == DayOfWeek.Sunday;
            if (isWeekend)
            {
                var weekendRule = activeRules.FirstOrDefault(r => r.RuleType == "TimeFrame" && r.RuleKey == "Weekend");
                if (weekendRule != null) basePrice += weekendRule.SurchargeAmount;
            }

            if (showtime.StartTime.Hour < 12)
            {
                var morningRule = activeRules.FirstOrDefault(r => r.RuleType == "TimeFrame" && r.RuleKey == "Morning");
                if (morningRule != null) basePrice += morningRule.SurchargeAmount;
            }
            else if (showtime.StartTime.Hour >= 18)
            {
                var eveningRule = activeRules.FirstOrDefault(r => r.RuleType == "TimeFrame" && r.RuleKey == "Evening");
                if (eveningRule != null) basePrice += eveningRule.SurchargeAmount;
            }

            // 4. Trả về danh sách ghế kèm trạng thái (Trống/Đã đặt) và GIÁ TIỀN (Price)
            var result = allSeats.Select(s => {
                var seatTypeStr = s.Type.ToString();
                var seatRule = activeRules.FirstOrDefault(r => r.RuleType == "SeatType" && r.RuleKey == seatTypeStr);
                decimal seatPrice = basePrice;
                if (seatRule != null)
                {
                    seatPrice += seatRule.SurchargeAmount;
                }

                return new
                {
                    id = s.Id,
                    row = s.RowName,
                    number = s.SeatNumber,
                    type = (int)s.Type, // 0: Normal, 1: VIP, 2: Couple
                    isBooked = bookedSeatIds.Contains(s.Id),
                    
                    gridRow = s.GridRow,
                    gridColumn = s.GridColumn,
                    isActive = s.IsActive,
                    price = seatPrice
                };
            }).ToList();

            return Ok(result);
        }
    }
}