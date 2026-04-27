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

        // GET: api/seats/room/{roomId}
        [HttpGet("room/{roomId}")]
        public async Task<IActionResult> GetSeatsByRoom(int roomId)
        {
            var seats = await _context.Seats
                .Where(s => s.RoomId == roomId)
                .OrderBy(s => s.Row)
                .ThenBy(s => s.Number)
                .ToListAsync();

            if (!seats.Any()) return NotFound("Phòng này chưa có ghế hoặc không tồn tại.");

            return Ok(seats);
        }

        // PUT: api/seats/{id}/type
        // Dùng để đổi loại ghế (VD: Set ghế thành VIP hoặc Lối đi)
        // 0 = Normal, 1 = VIP, 2 = Couple, 3 = Aisle
        [HttpPut("{id}/type")]
        public async Task<IActionResult> UpdateSeatType(int id, [FromBody] SeatType newType)
        {
            var seat = await _context.Seats.FindAsync(id);
            if (seat == null) return NotFound("Không tìm thấy ghế.");

            seat.Type = newType;
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã cập nhật ghế thành loại {newType}." });
        }
    }
}