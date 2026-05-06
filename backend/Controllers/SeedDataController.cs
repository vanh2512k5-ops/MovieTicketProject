using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeedDataController : ControllerBase
    {
        private readonly MovieTicketContext _context;

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

                // 3. TẠO 6 PHÒNG (MỖI RẠP 2 PHÒNG)
                var roomCGV_1 = new Room { CinemaId = cgv.Id, Name = "Phòng IMAX ", Type = RoomType.FirstClass };
                var roomCGV_2 = new Room { CinemaId = cgv.Id, Name = "Phòng 2D Thường", Type = RoomType.Regular };

                var roomBHD_1 = new Room { CinemaId = bhd.Id, Name = "Phòng 2D ", Type = RoomType.Regular };
                var roomBHD_2 = new Room { CinemaId = bhd.Id, Name = "Phòng 3D", Type = RoomType.FirstClass };

                var roomBeta_1 = new Room { CinemaId = beta.Id, Name = "Phòng Cơ Bản ", Type = RoomType.Regular };
                var roomBeta_2 = new Room { CinemaId = beta.Id, Name = "Phòng VIP", Type = RoomType.FirstClass };

                var rooms = new List<Room> { roomCGV_1, roomCGV_2, roomBHD_1, roomBHD_2, roomBeta_1, roomBeta_2 };
                _context.Rooms.AddRange(rooms);
                await _context.SaveChangesAsync();

                // 4. VẼ SƠ ĐỒ GHẾ CHO TỪNG PHÒNG TỰ ĐỘNG
                var seats = new List<Seat>();

                foreach (var room in rooms)
                {
                    if (room.Id == roomCGV_1.Id || room.Id == roomBHD_2.Id || room.Id == roomBeta_2.Id)
                    {
                        string[] rows = { "A", "B", "C", "D", "E", "F" };
                        foreach (var r in rows)
                        {
                            // Có tổng cộng 13 vị trí (bao gồm 12 ghế và 1 lối đi)
                            for (int slot = 1; slot <= 13; slot++)
                            {
                                if (slot == 3)
                                {
                                    // Vị trí số 3 là lối đi tàng hình
                                    seats.Add(new Seat { RoomId = room.Id, Row = r, Number = 0, Type = SeatType.Aisle });
                                }
                                else
                                {
                                    // Số thứ tự ghế hiển thị: Nếu qua lối đi thì trừ đi 1 để nối tiếp số
                                    int seatNum = slot < 3 ? slot : slot - 1;
                                    var type = SeatType.Normal;

                                    // Set ghế VIP: Hàng C, D, E và số ghế từ 4 đến 9
                                    if ((r == "C" || r == "D" || r == "E") && (seatNum >= 4 && seatNum <= 9))
                                    {
                                        type = SeatType.VIP;
                                    }

                                    seats.Add(new Seat { RoomId = room.Id, Row = r, Number = seatNum, Type = type });
                                }
                            }
                        }

                        // Hàng ghế Couple (K) đẩy sang bên phải
                        // Thêm 3 ghế tàng hình đầu tiên để tạo khoảng trống
                        seats.Add(new Seat { RoomId = room.Id, Row = "K", Number = 0, Type = SeatType.Aisle });
                        seats.Add(new Seat { RoomId = room.Id, Row = "K", Number = 0, Type = SeatType.Aisle });
                        seats.Add(new Seat { RoomId = room.Id, Row = "K", Number = 0, Type = SeatType.Aisle });

                        // Thêm 4 ghế Couple K1 -> K4
                        for (int i = 1; i <= 4; i++)
                        {
                            seats.Add(new Seat { RoomId = room.Id, Row = "K", Number = i, Type = SeatType.Couple });
                        }
                    }

                   
                    else if (room.Id == roomCGV_2.Id)
                    {
                        // Form ghế CGV Thường (2D)
                        string[] rows = { "A", "B", "C", "D", "E", "F" };
                        foreach (var r in rows)
                        {
                            for (int i = 1; i <= 12; i++)
                            {
                                var type = ((r == "C" || r == "D" || r == "E" || r == "F") && (i >= 5 && i <= 10)) ? SeatType.VIP : SeatType.Normal;
                                seats.Add(new Seat { RoomId = room.Id, Row = r, Number = i, Type = type });
                            }
                        }
                        for (int i = 1; i <= 4; i++) seats.Add(new Seat { RoomId = room.Id, Row = "G", Number = i, Type = SeatType.Couple });
                    }
                    else if (room.Id == roomBHD_1.Id)
                    {
                        // Form ghế BHD Thường (2D)
                        string[] rows = { "A", "B", "C", "D", "E", "F", "G" };
                        foreach (var r in rows)
                        {
                            for (int i = 1; i <= 9; i++)
                            {
                                var type = SeatType.Normal;
                                if (i == 5) type = SeatType.Aisle;
                                else if ((r == "C" || r == "D" || r == "E" || r == "F") && (i == 3 || i == 4 || i == 6 || i == 7)) type = SeatType.VIP;
                                seats.Add(new Seat { RoomId = room.Id, Row = r, Number = i, Type = type });
                            }
                        }
                    }
                    else if (room.Id == roomBeta_1.Id)
                    {
                        // Form ghế Beta Thường (Cơ bản)
                        string[] rows = { "A", "B", "C", "D", "E" };
                        foreach (var r in rows)
                        {
                            for (int i = 1; i <= 10; i++)
                            {
                                seats.Add(new Seat { RoomId = room.Id, Row = r, Number = i, Type = (r == "D" || r == "E") ? SeatType.VIP : SeatType.Normal });
                            }
                        }
                    }
                }

                _context.Seats.AddRange(seats);
                await _context.SaveChangesAsync();

                // 5. TẠO LỊCH CHIẾU PHÂN BỔ CHO CẢ 6 PHÒNG
                var showtimes = new List<Showtime>();
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var nextDay = today.AddDays(2);

                // Phim 1
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(9).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_1.Id, StartTime = today.AddHours(14), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(22).AddMinutes(15), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_2.Id, StartTime = tomorrow.AddHours(10).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = tomorrow.AddHours(20), BasePrice = 90000 });

                // Phim 2
                foreach (var room in rooms)
                {
                    // Hôm nay
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(8).AddMinutes(30), BasePrice = 70000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(13), BasePrice = 80000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(19), BasePrice = 85000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(21).AddMinutes(30), BasePrice = 90000 });

                    // Ngày mai
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(10), BasePrice = 75000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(15).AddMinutes(15), BasePrice = 80000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(18).AddMinutes(45), BasePrice = 85000 });

                    // Ngày kia
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = nextDay.AddHours(9), BasePrice = 75000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = nextDay.AddHours(20), BasePrice = 90000 });
                }

                // Phim 3 
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(10), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomCGV_2.Id, StartTime = today.AddHours(16).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(13).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = nextDay.AddHours(15), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = nextDay.AddHours(22), BasePrice = 85000 });

                _context.Showtimes.AddRange(showtimes);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Đã dọn dẹp và bơm dữ liệu thành công: 3 Rạp, 6 Phòng (mỗi rạp 2 phòng) kèm hàng trăm ghế và lịch chiếu!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi rồi sếp ơi: {ex.Message}");
            }
        }
    }
}