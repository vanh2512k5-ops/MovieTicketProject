using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public RoomsController(MovieTicketContext context)
        {
            _context = context;
        }

        // GET: api/rooms
        [HttpGet]
        public async Task<IActionResult> GetRooms()
        {
            var rooms = await _context.Rooms.ToListAsync();
            return Ok(rooms);
        }

        public class CreateRoomRequest
        {
            public int CinemaId { get; set; } 
            public string Name { get; set; } = string.Empty;
            public int NumberOfRows { get; set; }
            public int SeatsPerRow { get; set; }
        }

        // POST: api/rooms/create-with-seats
        [HttpPost("create-with-seats")]
        public async Task<IActionResult> CreateRoomWithSeats([FromBody] CreateRoomRequest request)
        {
            // 1. Tạo phòng
            var room = new Room
            {
                CinemaId = request.CinemaId,
                Name = request.Name,
                Type = RoomType.Regular // Mặc định là phòng thường
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            // 2. Sinh ghế tự động
            var seats = new List<Seat>();
            string rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            for (int r = 0; r < request.NumberOfRows; r++)
            {
                string currentRow = rowLetters[r].ToString();

                for (int num = 1; num <= request.SeatsPerRow; num++)
                {
                    seats.Add(new Seat
                    {
                        RoomId = room.Id,
                        Row = currentRow,
                        Number = num,
                        Type = SeatType.Normal // Mặc định là ghế thường
                    });
                }
            }

            _context.Seats.AddRange(seats);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = $"Đã tạo phòng {room.Name} với {seats.Count} ghế thành công!",
                RoomId = room.Id
            });
        }
    }
}