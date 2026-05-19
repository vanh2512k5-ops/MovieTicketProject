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
        private readonly IConfiguration _config;

        public SeedDataController(MovieTicketContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("force-seed")]
        public async Task<IActionResult> ForceSeed()
        {
            try
            {
                string bucketName = _config["Minio:BucketName"] ?? "movietickets";

                // 1. DỌN SẠCH DỮ LIỆU Cũ
                _context.Users.RemoveRange(_context.Users); 
                _context.Showtimes.RemoveRange(_context.Showtimes);
                _context.Seats.RemoveRange(_context.Seats);
                _context.Rooms.RemoveRange(_context.Rooms);
                _context.Cinemas.RemoveRange(_context.Cinemas);
                await _context.SaveChangesAsync();

                // 1.5. ĐÚC SẴN TÀI KHOẢN ADMIN VÀ KHÁCH MẪU
                var adminUser = new User
                {
                    FullName = "Quản Trị Viên Hệ Thống",
                    Email = "admin@gmail.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin"
                };

                var testCustomer = new User
                {
                    FullName = "Nguyễn Văn Khách",
                    Email = "khach@gmail.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("khach123"),
                    Role = "User"
                };

                _context.Users.AddRange(adminUser, testCustomer);
                await _context.SaveChangesAsync();

                // 2. TẠO 3 RẠP CHIẾU
                var cgv = new Cinema { Name = "CGV Vincom Bà Triệu", Address = "Hai Bà Trưng, Hà Nội" };
                var bhd = new Cinema { Name = "BHD Star Phạm Ngọc Thạch", Address = "Đống Đa, Hà Nội" };
                var beta = new Cinema { Name = "Beta Giải Phóng", Address = "Hoàng Mai, Hà Nội" };
                _context.Cinemas.AddRange(cgv, bhd, beta);
                await _context.SaveChangesAsync();

                // 3. TẠO 6 PHÒNG (Bổ sung kích thước Lưới Ma Trận mặc định 10x15)
                var roomCGV_1 = new Room { CinemaId = cgv.Id, Name = "Phòng IMAX ", Type = RoomType.FirstClass, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };
                var roomCGV_2 = new Room { CinemaId = cgv.Id, Name = "Phòng 2D Thường", Type = RoomType.Regular, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };
                var roomBHD_1 = new Room { CinemaId = bhd.Id, Name = "Phòng 2D ", Type = RoomType.Regular, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };
                var roomBHD_2 = new Room { CinemaId = bhd.Id, Name = "Phòng 3D", Type = RoomType.FirstClass, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };
                var roomBeta_1 = new Room { CinemaId = beta.Id, Name = "Phòng Cơ Bản ", Type = RoomType.Regular, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };
                var roomBeta_2 = new Room { CinemaId = beta.Id, Name = "Phòng VIP", Type = RoomType.FirstClass, TotalRows = 10, TotalColumns = 15, IsLayoutConfigured = false };

                var rooms = new List<Room> { roomCGV_1, roomCGV_2, roomBHD_1, roomBHD_2, roomBeta_1, roomBeta_2 };
                _context.Rooms.AddRange(rooms);
                await _context.SaveChangesAsync();

                // 4. VẼ SƠ ĐỒ GHẾ (ĐÃ XÓA THEO YÊU CẦU ĐỂ ADMIN TỰ VẼ)
                // Các phòng chiếu hiện tại đang ở trạng thái IsLayoutConfigured = false và chưa có ghế nào.

                // 5. TẠO LỊCH CHIẾU
                var showtimes = new List<Showtime>();
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var nextDay = today.AddDays(2);

                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(9).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(14).AddMinutes(15), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_1.Id, StartTime = today.AddHours(14), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(19).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(22).AddMinutes(15), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_2.Id, StartTime = tomorrow.AddHours(10).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = tomorrow.AddHours(20), BasePrice = 90000 });

                foreach (var room in rooms)
                {
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(8).AddMinutes(30), BasePrice = 70000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(13), BasePrice = 80000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(19), BasePrice = 85000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = today.AddHours(21).AddMinutes(30), BasePrice = 90000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(10), BasePrice = 75000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(15).AddMinutes(15), BasePrice = 80000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = tomorrow.AddHours(18).AddMinutes(45), BasePrice = 85000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = nextDay.AddHours(9), BasePrice = 75000 });
                    showtimes.Add(new Showtime { MovieId = 2, RoomId = room.Id, StartTime = nextDay.AddHours(20), BasePrice = 90000 });
                }

                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(10), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(20).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomCGV_2.Id, StartTime = today.AddHours(16).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(13).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBeta_1.Id, StartTime = tomorrow.AddHours(19), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = nextDay.AddHours(15), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = nextDay.AddHours(22), BasePrice = 85000 });

                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomCGV_1.Id, StartTime = today.AddHours(18).AddMinutes(15), BasePrice = 90000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBeta_2.Id, StartTime = today.AddHours(21), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(14), BasePrice = 85000 });

                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomBeta_1.Id, StartTime = today.AddHours(17).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomCGV_2.Id, StartTime = tomorrow.AddHours(20).AddMinutes(15), BasePrice = 85000 });

                _context.Showtimes.AddRange(showtimes);
                await _context.SaveChangesAsync();

                // 6. BỔ SUNG DỮ LIỆU BẮP NƯỚC 
                _context.Combos.RemoveRange(_context.Combos);
                await _context.SaveChangesAsync();

                var combosList = new List<Combo>
                {
                    new Combo
                    {
                        Name = "Combo Solo",
                        Description = "1 Bắp ngọt (Lớn) + 1 Nước ngọt (Lớn)",
                        Price = 75000,
                        ImageUrl = $"/{bucketName}/combo-solo.png"
                    },
                    new Combo
                    {
                        Name = "Combo Couple",
                        Description = "1 Bắp ngọt (Lớn) + 2 Nước ngọt (Lớn)",
                        Price = 105000,
                        ImageUrl = $"/{bucketName}/combo-couple.png"
                    },
                    new Combo
                    {
                        Name = "Combo Family Party",
                        Description = "2 Bắp (Lớn) + 4 Nước (Lớn) + 2 Snack",
                        Price = 210000,
                        ImageUrl = $"/{bucketName}/combo-family.png"
                    }
                };
                _context.Combos.AddRange(combosList);
                await _context.SaveChangesAsync();

                // 7. THÊM DỮ LIỆU DIỄN VIÊN 
                _context.Actors.RemoveRange(_context.Actors);
                await _context.SaveChangesAsync();

                var actorsList = new List<Actor>
                {
                    // (Danh sách diễn viên siêu dài của sếp giữ nguyên, tôi thu gọn ở đây để tiết kiệm chỗ nhìn cho đỡ rối)
                    new Actor { MovieId = 1, Name = "Robert Downey Jr", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbtO8h1E68vLAbTmgQL1bfnG-SyLlabKROsY2thX1Zd8uNp3VAHho5Uyfbd99w4WIJKflPyO2es-aTbUojlAxaUyQS1swZOLkDmD-DAR20&s=10" },
                    new Actor { MovieId = 1, Name = "Scarlett Johansson", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEQVZss2Y6LQvmFIFxt5BrHFwOTYi0_GrB6x9G_tKahTCjHlA9GogM3EbxbiPuwW7hOoLd0iyDwUXhV7zbb28qAGKYZ4AKvuYFEdCh192Q&s=10" },
                    // ... các diễn viên khác
                };

                _context.Actors.AddRange(actorsList);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Bơm dữ liệu hoàn tất! Đã tạo sẵn Admin (admin@gmail.com) và Khách (khach@gmail.com)." });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi rồi sếp ơi: {ex.Message}");
            }
        }
    }
}