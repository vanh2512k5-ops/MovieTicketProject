using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeedDataController : ControllerBase
    {
        // 1. Khai báo biến context để làm việc với Database
        private readonly MovieTicketContext _context;

        // 2. Hàm khởi tạo - Đây là chỗ kết nối Controller với Database
        public SeedDataController(MovieTicketContext context)
        {
            _context = context;
        }

        [HttpPost("force-seed")]
        public async Task<IActionResult> ForceSeed()
        {
            try
            {
                // 1. DỌN SẠCH DỮ LIỆU CŨ
                _context.Showtimes.RemoveRange(_context.Showtimes);
                _context.Seats.RemoveRange(_context.Seats);
                _context.Rooms.RemoveRange(_context.Rooms);
                _context.Cinemas.RemoveRange(_context.Cinemas);
                await _context.SaveChangesAsync();

                // 2. TẠO 3 RẠP CHIẾU
                var cgv = new Cinema { Name = "CGV Vincom Bà Triệu", Address = "Hai Bà Trưng, Hà Nội" };
                var bhd = new Cinema { Name = "BHD Star Phạm Ngọc Thạch", Address = "Đống Đa, Hà Nội" };
                var beta = new Cinema { Name = "Beta Giải Phóng", Address = "Hoàng Mai, Hà Nội" };
                _context.Cinemas.AddRange(cgv, bhd, beta);
                await _context.SaveChangesAsync();

                // 3. TẠO 3 PHÒNG VỚI 3 KIẾN TRÚC KHÁC NHAU
                var roomCGV = new Room { CinemaId = cgv.Id, Name = "Phòng IMAX (Ghế giữa)", Type = RoomType.FirstClass };
                var roomBHD = new Room { CinemaId = bhd.Id, Name = "Phòng 2D (Có Lối Đi)", Type = RoomType.Regular };
                var roomBeta = new Room { CinemaId = beta.Id, Name = "Phòng Cơ Bản", Type = RoomType.Regular };

                var rooms = new List<Room> { roomCGV, roomBHD, roomBeta };
                _context.Rooms.AddRange(rooms);
                await _context.SaveChangesAsync();

                // 4. VẼ SƠ ĐỒ GHẾ CHO TỪNG PHÒNG
                var seats = new List<Seat>();

                // 🎨 MẪU 1: RẠP CGV (Giống Ảnh 3 - Dune Part Two)
                // VIP tập trung ở giữa, Couple ở hàng cuối
                string[] rowsCGV = { "A", "B", "C", "D", "E", "F" };
                foreach (var r in rowsCGV)
                {
                    for (int i = 1; i <= 12; i++)
                    {
                        var type = SeatType.Normal;
                        // Hàng C, D, E, F từ ghế 5 đến 10 là VIP
                        if ((r == "C" || r == "D" || r == "E" || r == "F") && (i >= 5 && i <= 10)) type = SeatType.VIP;
                        seats.Add(new Seat { RoomId = roomCGV.Id, Row = r, Number = i, Type = type });
                    }
                }
                // Hàng Couple
                for (int i = 1; i <= 4; i++) seats.Add(new Seat { RoomId = roomCGV.Id, Row = "G", Number = i, Type = SeatType.Couple });


                // 🎨 MẪU 2: RẠP BHD (Giống Ảnh 4 - Lật Mặt 7)
                // Có lối đi (Aisle) chia đôi phòng chiếu
                string[] rowsBHD = { "A", "B", "C", "D", "E", "F", "G" };
                foreach (var r in rowsBHD)
                {
                    for (int i = 1; i <= 9; i++)
                    {
                        var type = SeatType.Normal;
                        if (i == 5) type = SeatType.Aisle; // Ghế số 5 biến thành lối đi
                        else if ((r == "C" || r == "D" || r == "E" || r == "F") && (i == 3 || i == 4 || i == 6 || i == 7)) type = SeatType.VIP;
                        seats.Add(new Seat { RoomId = roomBHD.Id, Row = r, Number = i, Type = type });
                    }
                }
                // Hàng Couple cũng bị xẻ đôi bởi lối đi ở vị trí số 3
                seats.Add(new Seat { RoomId = roomBHD.Id, Row = "H", Number = 1, Type = SeatType.Couple });
                seats.Add(new Seat { RoomId = roomBHD.Id, Row = "H", Number = 2, Type = SeatType.Couple });
                seats.Add(new Seat { RoomId = roomBHD.Id, Row = "H", Number = 3, Type = SeatType.Aisle }); // Lối đi
                seats.Add(new Seat { RoomId = roomBHD.Id, Row = "H", Number = 4, Type = SeatType.Couple });
                seats.Add(new Seat { RoomId = roomBHD.Id, Row = "H", Number = 5, Type = SeatType.Couple });


                // 🎨 MẪU 3: RẠP BETA (Khối cơ bản)
                string[] rowsBeta = { "A", "B", "C", "D", "E" };
                foreach (var r in rowsBeta)
                {
                    for (int i = 1; i <= 10; i++)
                    {
                        seats.Add(new Seat { RoomId = roomBeta.Id, Row = r, Number = i, Type = (r == "D" || r == "E") ? SeatType.VIP : SeatType.Normal });
                    }
                }

                _context.Seats.AddRange(seats);
                await _context.SaveChangesAsync();

                // 5. TẠO LỊCH CHIẾU (Để test được cả 3 phòng)
                var showtimes = new List<Showtime>();
                var today = DateTime.Today;

                foreach (var room in rooms)
                {
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(19), BasePrice = 85000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(21).AddMinutes(30), BasePrice = 90000 });
                }
                _context.Showtimes.AddRange(showtimes);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Đã dọn dẹp sạch sẽ và bơm dữ liệu 3 form rạp chuẩn chỉnh!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi rồi sếp ơi: {ex.Message}");
            }
        }
    }
}