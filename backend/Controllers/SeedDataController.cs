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
                            for (int slot = 1; slot <= 13; slot++)
                            {
                                if (slot == 3)
                                {
                                    // Lối đi giữa → ô trống
                                    seats.Add(new Seat { RoomId = room.Id, RowName = null, SeatNumber = 0, GridRow = Array.IndexOf(rows, r), GridColumn = slot - 1, Type = SeatType.Empty, IsActive = false });
                                }
                                else
                                {
                                    int seatNum = slot < 3 ? slot : slot - 1;
                                    var type = SeatType.Normal;
                                    if ((r == "C" || r == "D" || r == "E") && (seatNum >= 4 && seatNum <= 9))
                                        type = SeatType.VIP;
                                    seats.Add(new Seat { RoomId = room.Id, RowName = r, SeatNumber = seatNum, GridRow = Array.IndexOf(rows, r), GridColumn = slot - 1, Type = type, IsActive = true });
                                }
                            }
                        }

                        // Hàng K: 3 ô trống + 4 ghế Couple
                        seats.Add(new Seat { RoomId = room.Id, RowName = null, SeatNumber = 0, GridRow = 6, GridColumn = 0, Type = SeatType.Empty, IsActive = false });
                        seats.Add(new Seat { RoomId = room.Id, RowName = null, SeatNumber = 0, GridRow = 6, GridColumn = 1, Type = SeatType.Empty, IsActive = false });
                        seats.Add(new Seat { RoomId = room.Id, RowName = null, SeatNumber = 0, GridRow = 6, GridColumn = 2, Type = SeatType.Empty, IsActive = false });

                        for (int i = 1; i <= 4; i++)
                            seats.Add(new Seat { RoomId = room.Id, RowName = "K", SeatNumber = i, GridRow = 6, GridColumn = i + 2, Type = SeatType.Couple, IsActive = true });
                    }
                    else if (room.Id == roomCGV_2.Id)
                    {
                        string[] rows = { "A", "B", "C", "D", "E", "F" };
                        foreach (var r in rows)
                        {
                            for (int i = 1; i <= 12; i++)
                            {
                                var type = ((r == "C" || r == "D" || r == "E" || r == "F") && (i >= 5 && i <= 10)) ? SeatType.VIP : SeatType.Normal;
                                seats.Add(new Seat { RoomId = room.Id, RowName = r, SeatNumber = i, GridRow = Array.IndexOf(rows, r), GridColumn = i - 1, Type = type, IsActive = true });
                            }
                        }
                        for (int i = 1; i <= 4; i++)
                            seats.Add(new Seat { RoomId = room.Id, RowName = "G", SeatNumber = i, GridRow = 6, GridColumn = i - 1, Type = SeatType.Couple, IsActive = true });
                    }
                    else if (room.Id == roomBHD_1.Id)
                    {
                        string[] rows = { "A", "B", "C", "D", "E", "F", "G" };
                        foreach (var r in rows)
                        {
                            int col = 0;
                            int seatNum = 1;
                            for (int i = 1; i <= 9; i++)
                            {
                                if (i == 5)
                                {
                                    // Lối đi giữa → ô trống
                                    seats.Add(new Seat { RoomId = room.Id, RowName = null, SeatNumber = 0, GridRow = Array.IndexOf(rows, r), GridColumn = col++, Type = SeatType.Empty, IsActive = false });
                                }
                                else
                                {
                                    var type = ((r == "C" || r == "D" || r == "E" || r == "F") && (i == 3 || i == 4 || i == 6 || i == 7)) ? SeatType.VIP : SeatType.Normal;
                                    seats.Add(new Seat { RoomId = room.Id, RowName = r, SeatNumber = seatNum++, GridRow = Array.IndexOf(rows, r), GridColumn = col++, Type = type, IsActive = true });
                                }
                            }
                        }
                    }
                    else if (room.Id == roomBeta_1.Id)
                    {
                        string[] rows = { "A", "B", "C", "D", "E" };
                        foreach (var r in rows)
                        {
                            for (int i = 1; i <= 10; i++)
                            {
                                var type = (r == "D" || r == "E") ? SeatType.VIP : SeatType.Normal;
                                seats.Add(new Seat { RoomId = room.Id, RowName = r, SeatNumber = i, GridRow = Array.IndexOf(rows, r), GridColumn = i - 1, Type = type, IsActive = true });
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

                // ============ PHIM 1 (Bổ sung thêm lịch) ============
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(9).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(14).AddMinutes(15), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_1.Id, StartTime = today.AddHours(14), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(19).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(22).AddMinutes(15), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_2.Id, StartTime = tomorrow.AddHours(10).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = tomorrow.AddHours(20), BasePrice = 90000 });

                // ============ PHIM 2 ============
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

                // ============ PHIM 3 (Bổ sung thêm lịch) ============ 
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(10), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(20).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomCGV_2.Id, StartTime = today.AddHours(16).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(13).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBeta_1.Id, StartTime = tomorrow.AddHours(19), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = nextDay.AddHours(15), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = nextDay.AddHours(22), BasePrice = 85000 });

                // ============ PHIM 4 (MỚI THÊM) ============ 
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomCGV_1.Id, StartTime = today.AddHours(18).AddMinutes(15), BasePrice = 90000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBeta_2.Id, StartTime = today.AddHours(21), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(14), BasePrice = 85000 });

                // ============ PHIM 5 (MỚI THÊM) ============ 
                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomBeta_1.Id, StartTime = today.AddHours(17).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomCGV_2.Id, StartTime = tomorrow.AddHours(20).AddMinutes(15), BasePrice = 85000 });

                _context.Showtimes.AddRange(showtimes);
                await _context.SaveChangesAsync();
                // Bổ sung dữ liệu bắp nước
                _context.Combos.RemoveRange(_context.Combos);
                await _context.SaveChangesAsync();

                var combosList = new List<Combo>
                {
                    new Combo
                    {
                        Name = "Combo Solo",
                        Description = "1 Bắp ngọt (Lớn) + 1 Nước ngọt (Lớn)",
                        Price = 75000, 
                        ImageUrl = "/movietickets/combo-solo.png"
                    },
                    new Combo
                    {
                        Name = "Combo Couple",
                        Description = "1 Bắp ngọt (Lớn) + 2 Nước ngọt (Lớn)",
                        Price = 105000,
                        ImageUrl = "/movietickets/combo-couple.png"
                    },
                    new Combo
                    {
                        Name = "Combo Family Party",
                        Description = "2 Bắp (Lớn) + 4 Nước (Lớn) + 2 Snack",
                        Price = 210000,
                        ImageUrl = "/movietickets/combo-family.png"
                    }
                };

                _context.Combos.AddRange(combosList);
                await _context.SaveChangesAsync();

                // 7 . Thêm dữ liệu diễn viên
                _context.Actors.RemoveRange(_context.Actors);
                await _context.SaveChangesAsync();

                var actorsList = new List<Actor>
                {
                    // Phim1: Avengers: Endgame 
                    new Actor { MovieId = 1, Name = "Robert Downey Jr", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbtO8h1E68vLAbTmgQL1bfnG-SyLlabKROsY2thX1Zd8uNp3VAHho5Uyfbd99w4WIJKflPyO2es-aTbUojlAxaUyQS1swZOLkDmD-DAR20&s=10" },
                    new Actor { MovieId = 1, Name = "Scarlett Johansson", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEQVZss2Y6LQvmFIFxt5BrHFwOTYi0_GrB6x9G_tKahTCjHlA9GogM3EbxbiPuwW7hOoLd0iyDwUXhV7zbb28qAGKYZ4AKvuYFEdCh192Q&s=10" },
                    new Actor { MovieId = 1, Name = "Chris Evans", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb7xOzET9SF0gdYpRmezJC_sDtosUUOxrVj5hxBw6fnTmEV1fi8hDK835g_Eh3skST1f3EDqvVBSveU3M-KTLMOcfFsjzl5P1V0A-DSOjo&s=10" },
                    new Actor { MovieId = 1, Name = "Chris Hemsworth", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTRfu25YRtM6QJwgTiBpT7gWKpst9nV5AS5QCklA6i37nq2IScJUuasLIyo9wT_G-swvPUh_WlvYho5vinbC5GDwcAEZ6wIHJeIju-VxRlbBzH0D88tNRdkMl0j2beVGh3BTiFMdXDbNFxZ&s=19" },
                    new Actor { MovieId = 1, Name = "Mark Ruffalo", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcRv889iYXMFcHYfphk9Kj5PkOOYVaw-G1ch-jvMYnqKmDapspS3xPSATjePDNvLnDRYGtVsYeZ2h32cwus7pwajqIQn3ycRAAPJXVnYUsqwbNDlpzqeDsdzFeFAYEoZwttFC2bb_SxXqRWD&s=19" },
                    new Actor { MovieId = 1, Name = "Jeremy Renner", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJ4O0tINaISa3pFSyWIGuTLc8Qj7wCw0p4_ABo3oNfOttcznBhBABW8DdQjN8GBbXUF6Q488s3XRPvFkVmfjU-pury15fxPD3b8T3sCJlI&s=10" },
                    new Actor { MovieId = 1, Name = "Brie Larson", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcR5QP_QdeZbdosUAUmVTeLDO6DYhFwfu9-2r8IBz5s1t_4ZfNFxG38Adt6wyCYMrudGv4hVebq4ujA03II1s9PnjC9QOxWsqm7-ijv1D5FLisKztyZmggxcPi60U2UA9kdY0ujEogIts6M&s=19" },
                    new Actor { MovieId = 1, Name = "Paul Rudd", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJpaDEaUXTuI9ntFnmn4lLOXgUXz5pzJYR00S5zvkDw883v8D8sGczQjRFZZTbBKalnqw1Ig6FK_av8oUE4XRPcaFzRio_BAylySOSJLnL&s=10" },
                    new Actor { MovieId = 1, Name = "Don Cheadle", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHYEXNoAPPDDS-5ZMG7Me46NahQGaSRBi3Emo447y9eY7l64W_nSkMtRsZ9-kw51E-QsLgcFXVoU6bk_5GmzJBGST9OFGETetqTH2MkwHn&s=10" },
                    new Actor { MovieId = 1, Name = "Elizabeth Olsen", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTj2PI7FbL4fn8Y_q8_ZfxG-16aDhz9oL7N8ZH9Zo0zEXrbXoJemNRZF6CvP2cPQekjy8vH14tk5z_YBwbwb1z5UcqXPcE8vO13lTa3GdMpbA&s=10" },
                    new Actor { MovieId = 1, Name = "Chadwick Boseman", Biography = "", AvatarUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAIQAwgMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAAFAAIDBAYBB//EAD0QAAEDAgQDBQUHAQgDAAAAAAEAAgMEEQUSITETQVEGIjJhcRSBkaGxByNCUsHR8BUlMzRDU3KS8WJj4f/EABkBAAMBAQEAAAAAAAAAAAAAAAACAwEEBf/EACERAAICAgIDAAMAAAAAAAAAAAABAhEDIRIxE0FRBEKB/9oADAMBAAIRAxEAPwCMpuycQmkLBjhTU4ppQB592wcBipsXOu0X+eyBauIIG3mjXapkDMUlMMt9e+M3hcd0CBLdigGdc4jYkf7l1lswGpabXC5kJdYuaUbwnD2PAL9QD8lkpcezYRcuipTYcZdt+l/qjFNheW+c2t0G6JwQta24GimjA08lySySfR2RxRXZHBRMZ+EFXoKa2zQnU0ZOW3NF2UzWfyym7ZZJIoezkbBQyQHojPC81Wmiy7hGzaRn6mkYRYsb8EDxHC45C8sFj+q180YLXEjZDatg103N1sZNCygpGCqKaWndaQEDqmcPTNmb6XWprKdsjcpbcLM1tI+mlsRp1XXDJy0zhnj4uxuXS1nX0W57IVjqmlkY9thEQQfVYVri5zddStr2Mki9lnZFHlIeCSTe97/sqE0aNcJs4DrtouuNl6J2Op6eXBIHvgjc651c0E7rUrCzzoMe7wtLvQJ4ppztDL/wK9hbDENomD0aFK1oGwCahbZ4xwZf9GT/AIFJe0ZW/lb8EkUHJnkpKa4hR8TzTcyQYkdZQyyMhYXzPa1gFy52w05pxcqOMSU4w+Y1ZdwXNyuyje+iAPPcbl4+K1Usb2lj3m2XXRUDr4VPXRMYbwvzMdtcai3VV23QYSRsDi02tda3C25adtuYssvStMjgX91o3Wqww/cNHn8lHN0dGDsIM0ZlC60EOtlTGPHiNvMnYLkcrHv+7fdc1HVaClI61rEaeSJNe5vhNlQpGeHW9/NEBHm8J/VAw5riVFO/M25CkMbm80ya+TZFBZSLrggjdDqth73ki/AIbcuVOpiu0k2F1lGgKUIdidO2WHXVF6yIs2Q6e0jco+qeLpksm0ZdkZZNfk3mtr2NDI8Oe4eJz+84enT+brKOZmlfrYkH4rR9jMwNUTl4d2211zarts4Wandei9hHZsDYB+GVw+d15yFv/s9d/ZErfyzH6JoisPYvUS0uFVNRBlEscZc3NqLrDQ9tsWjmaZxC9o8TMmXN6LcYw3NhFS23+U76LyIushgj1aHtHh8kLJOJbM0G3S6S8q4jxtdcWWFDi8JwkVTOnB6w0s51WrqdlbRyU0hs14BzdCnNddOvcWKAPN8TAbVyxvla/hvy52ty3seiqssivaWEU+LSm2j9RbzQoNLc1+SDKLUILIywa53WBWkgcKaEX5CyAYeDJWRXF2tF7I5Mxzzw2/FRyHRi0irV1jp25dAOgKiZUGBrXl+p5AhFIcPiiYM9s568lboaCllJaYzK8bAC4/nvU1JLopwk+wXTY7M1/wB2cjR77eqPYfj5flEouCPESNSuS01JG6zqU2/2/sofZKVwaYHMte9jyWSaGjF/TSe2MfFe2vqoZ5Da3Lqg4bPC1rX7K1VvdHRtud0hUbVYiI4yMzSRus3iWOy+Ea+amqHCR1wdHm1rKZmDMcB7QMzz/ltG3qmhQmS60Z9+JyybuJ965DUPvn0IvqDuAtDNhdNC2/AcPeD9FQlpYJWktsCBZV5r4R8cvoCqPu6t7jq0d71Ws7L0/CoOL/qG/u5H+eSymINLJsg10A9y2mAWZhkY59OY/wDisjnfYWaVufs8fejq2f8AtB+Swjbra/Z0f8azoWlMjGaDEcQZLQ1EdMC+QMII5arBR9mq99Px38Nkd982tltrxwvqbtAzPDbe5U3Yg19KaQEECEk663unYqBMeBQOjaTHJcgc1xHoX/cx+LwjkkikaeVgpwTAV0FTNJmlPBUIKfdAATtLhvtjGSwf347o/wDILLywywyFlUwsJO3l5LbYjxmhhp2Znl1hm0AKqik9rpR/UGtLyNHNFgB09VKWSpFoY7iAcHB4rnI1Td57vJUaWm9llmYfCDo7yV+jGWQtPPmpzd7KwVIgxF8zIwGRvIJ1FrfNVmOxp/8AhWcM6HI3cjqStTFSx1TA0Ri46E3SOE1cBLYJ3NB37hP6qamkUcGwPhdLiMlZJ7e+rpoWscLNeZDn001Pnz5W3N1ajgIkLKkNcMtzKzuhw9ORRSHDZS8+01Ty0m9gLaqStjpqYdwBo/E4+IpnOwjCgZGHgRw5y5rXdy+4HnyVvEGukoxcbKlCXSPbdp2sPJE5GNfT5blRbKpAKhhjkqo+JfKL6Dcu5KTEP6kyJj6RkjCXHNStFnhoG7n9fRRPLqee1yATe46om6aSoYA4NLx+bRUjJInKNmZbWYu+Vxme+ONjbhswL8x5C9t/SyrR1bzOc8LmE8h+i0EkFZK/Vsfvco/6c6FueYAH1P7JnNE+DQAlpXVWIxtiHiG++y2FBStp4mtzOLj4i7RZ9he6vjaxmZzjYu/KAQtMRc3O66MbtEMipkrFsPs8faqrGjmxp+ZWPGmy1P2fG2KTgk2dDy9VREmFsUmP9a4PJzgfkvP5yW1MtyeY381vsTbfG2vBbla4XN9tSsHXgCtmaDcCQkeYutbMRI2uqmtAFRLYCw7xSVbKfzLiW2MVQ5OzKIJyDCYFOuCbD3noor3cA3n8k5ugsEASSszxvF9cunqNf0UuK4c6V/Cje5kUQBcW/VQgKxxzWwv75jlbDw3W2cevyXLnTuzs/HlqjO10fAmhaTmzAgnrZTQAKv2ilblpHtDg6wL29DzU0EgGW/NL6G/ajR4NEWm7Dc7I0YpHOtcg9VnaCubDlvbVHDi7Xx2aBe3vuoUXs5OBG27n5R5lBK98brxxscZH7F+tkQiDqmXiVG3S6E45BUxOz0GUydCU6Rj0X6OhkjLC8D7z5Im7C3siz2FrXWIjq8XYWunnY+20eUg+4i6IO7Vk0/BlkeHWtl1+CHjZqyL2TYvS3eGxjf5KKgzZjG+3EHI8/RBKnGK8yOfFGL9HXv8ABWsPkqZncaUZZBbRbxaF5Js1AiuLgaobisLi24cVZgxANh73iVSsrY3hwvskocFYa0urzys2w/nuRsaoRhpD655bsG6/EIsy+ay7cXR5+XsmKJ9nmVL8Ty0jw17ozubWCGK7g0phriR4ixzQB6aKyJEtfWVENQ9lQyzgTzOqpUtDPiE0nszM+QF3RaHtLSunq2z5TkdHGNORKZ2ZjLaioy6sMT2ZjoP+0MVAb+j1HVvzXFpuHJ0Py/dJaB54F0uyi1rlNJytvunt0NzulNHs7oJO5TmhR3JFipQgB6ZTyiKaQSaNk5dE4KtO1LKPJbHhLi9A3tLG0MZLFK0sJtlvqFWhlL2g22UOPsaJGvBNyLW5W1UFJIcp11NrDytupuGqKRncrCjZi22p0VumxFjXOaHB7gb7/qhQIc9rXHc7qrRQzVMnBYNXdenVIoIo8j9GqONMitndxXnkBoF1lbU1Ds7IHPGlrbm/kg1C2sY6UUmFh5jdZ73nMRv8lqYcC7QSUNRUvlZEYJmxSRBpOUnnpuNR7ljgrKRnrZWp8LxOeZ8ns5AbewsO/rpbmrctHJNFwgwNlygnNF16H3hX6Xst2i9tFK+eNhEYeZNQDfl63T34Z2kdVyYcxl5IxmL84DS3rdZv0MnH2YeqgqKScioicBzIBsd/2UsVVG05QSD5/qjtVgnaEGozUr3tje1j+/fMXbW+IWZxq1BVup62mkima4tu0GxI+qKvsVyrovPqI3x91wuhsspDiCb3Q0iopagMnDgCdtiFaJDYDI86nZN4yfkvsI4C/NUTWJtlFz5o+ze6AdmnF0EslrZyNbaI/GrxVKjnk7dkpsE1j3NeHRnK4cxouF1zlA96bmDdgmFJZqmeT+8le7bd3RRB72hwa9wDjcgFNuSkgBX8z8VxKySAKTBZri7Ycl3fdK9yT1XUGDgpAowpEAPaopmjLdShJ7MwsgALiVOyeMXF2jms9TPLHPY9wbkvluRqRy+i2MkfkslU05hllfkabkgEhZI1DnTB1ttdtdPNEsGa6TExI6wZGbkg20QCKR5INgANgRdEcLxDgVLJgGHkTb5C6Vx0PGWzdS1E1HMKmkeY5Tu4a39QdFqMI7U1k8MnEiikJALrOyHTyOh+KyMruNTtkaLgjT1XaSf2dzZGkMefECNCua2d0VFnqEHaCCSWNzYnssNdRvfre3zXZcapoqueocA9zo2x9yRpOhJ2JH5lkqbHoXRff0tze+ZpSnxqjDHZIvnZFjLFANVnaelEEoipZ+JclhIAGw31XnWM4mcTxHPK1pyZsoGoBU+K4sZ2FsBEbCLEtO6CwANu+2gv8FqMmoR6BeIyZqx9z3idD0KpVUweeG0enxXKqoEtRLI3Qk223TcPj9prI4nHnqegXQkcDfZqsFhMFBGwjcXIRJjidlXDsrQ1osBsrEII2CdCExIaLBR6/iXd91x+uyAOHRcKcmaoA5cpJZT+ZqSAKgFt04Lu+65bvWQYOCkGqbYJ4F/CgBzVIyyj2VqgpJ62pip6ZpdJIdByA6n0QaPoMKnxObh01rAXfIfDGPNZPtbRso6ueJsxljYRllaLB123K9jxCmi7O9mJ209jI4d9x3e52g+q80xmmbNVFoaGgtbYeQFh9FCWTZaGO0efnunKCWhSwZgcsdvR41RbFqBkbxwmu18PO6FOc4dwt0+fxVVK1onOLizbdmaltTTMgfm073REKujLS4yC7QN+nmsbhVZJThrw7Toddv59VsoMYhNOC8lziLEEXuFCcXZ04pqgc6jr2Sl1I8kE6ZuiYaXEX3zvcGlahtbAymz3iDmDvXN7D4KDEJ4uDmMgG1gOaT+FtfTONpSx1gLu68lBXTx0dNIxxGZwtoeqIS1sNOHSSONwNvNZPE658xztJIuTa6pjVsjlmktFBznl7SLZiLtsb39FosAoDAHzvb3y6wv06eqp9n8OkrsRLY4HSMaxzg0Nvp5fL4rUMjyAN000KuqOTZ0G6ljv1UYGluasRN7t+aYByaLDZOI71k0hYYcTbpOv+FNNmb6oA5k8wupmc9EkAQp5AvdJJACbq6xUo7uySSAOs1JB11K9D7C0cMWHe1Nb99K6xceQ6BJJJIaI/t4f7MhHJ1TGCOt3C689xU3rwDsGAfMpJLnmdOMo4hCyUAvGo2sbLJ4tEyGX7sWHqkknwmZkVKV7i0Am/rqrdPNK27mvIIvaySSuznRIKmZ1OXcRwL3d63PRWBVzve1rn6HkkklHTZQq5ZC52Zxdz1Pqq0bcx7xNspNl1Jb6JrbPRPs5iY3HIg1th7M76tWq7aYdTRwGsijySg5Tl0DvUJJKON7LyWjJgDM49DZWGiwsEkl0EDvO9lG5JJBgx/d8OijOu6SSAFddSSQB/9k=" },
                    new Actor { MovieId = 1, Name = "Tom Holland", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLA3AuQ6pY1YMk-O-AI2MNNFCOOLqNK0VhALzChdcxtSONo7FD3Fw2toCxwm-2_CPku2dCiMV1n1W7zkIlF6eorCvQ_5utsCcOBxrrS8vE&s=10" },

                    //Phim 2: Deadpool & Wolverine 
                    new Actor { MovieId = 2, Name = "Ryan Reynolds", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQQnbejd0rpkZcCUE2Qbd1ZqlE-kH_ErnIHTxW4TrTeAnHfnK_0qgi4exGwK0Ip2T6YW07IZltGqFNDqlyCsj9qWhvEOUmAxb8V1fwwfKh-A&s=10" },
                    new Actor { MovieId = 2, Name = "Leslie Uggams", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSWao-uSUQEgtQqrAhna4nqO3O8YTNTGEngTiTqznvNA_ersx0T99q1g4Z0QyOq51LVWyH8PJVlmzCtjBKmNOOgh0kuJKxycUPr8cZeh3LYQ&s=10" },
                    new Actor { MovieId = 2, Name = "Emma Corrin", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIt6g4aQEmbzGTGSuvjJPbQ-o4AGtC27GO64YLNmRjaduzqxa8hfTQ4wF5YMb2Gdnn_t9QHa_qGf4cf2D38ld8Vyqap5cm_2jCtXQw1QZR&s=10" },
                    new Actor { MovieId = 2, Name = "Hugh Jackman", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQQAozkP1S3O6dzRuRozc3jyQEtRZly39RJqA-Mj2ZotdBrzdRfo_Ep-MDOJVRw3-YZpzx_DtvD3Z2a2WVZnV1ExyFJyr6T701EZyDRzypWvgxIZ7XOPEznuAJI-UceT8KvKTFf6x39GaW7&s=19" },
                    new Actor { MovieId = 2, Name = "Dafne Keen", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqm2aqh4wZJsOBcCn_BOBiT71Uu2SKd4sYl4k3TUtznuQ9vRk0xHLnLhR02edPrADmJ59Qyo9hu9hfi-yMYYCm2mGsGg6Knj2qJIyC0_5s0Q&s=10" },
                    new Actor { MovieId = 2, Name = "Channing Tatum", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTv5ciWxCA_XO7kkxi6b08gK5qX4pVkBAjVnAFHMb_HFqkWonB4S62LISZ4xyVpt4dt6CzGOw_bTenIo49DTRvnSMM1pszjL5Qh7hbqyVWV&s=10" },

                    //Phim 3: Past Lives 
                    new Actor { MovieId = 3, Name = "Greta Lee", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMVqW5wGI11oXAddciZZV3eK-7ZkelQDMc6lE1wsWIKidDKr_-p_T_8X6maELPLOADKGyVoTr0blzjwD8kpaad8qUv9oOW-d0rJsu3PSgQNw&s=10" },
                    new Actor { MovieId = 3, Name = "Teo Yoo", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfZJRmb5vF_L2oJ5gHvt-ZjmafcM-JthMizRp7QLLJfvtZUWyL2ew63br13awm4LGbcaMjEua1EgHgKPGECrK_dilVNddvMaQiGcSj2WK89g&s=10" },
                    new Actor { MovieId = 3, Name = "John Magaro", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFO1YtT_gt05hLrwiHjeyZiozwB7Ndo-cASKDpe6TCS6leESG34PF1vbEJzugg_5lQmnfYf3PtXiqWGvqbGjHT9dAPdWmuWsQrqT-8klQbdg&s=10" },
                    new Actor { MovieId = 3, Name = "Chase Sui Wonders", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6f_GVI_R5Ko49iI_ZV5R2PW3SDYEjNNFQMjr7c3d2KMUERKTi-y_elxwYth88q1opABjePl6BONE3mrv5F1m4F0x_KUudk-t5ZOKvRwf2xA&s=10" },
                    new Actor { MovieId = 3, Name = "Isaac Cole Powell", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUktn8V9TGVyF1JREEphpzlq_YlfXOyCbX2qjJDUAa8AkRAcsbT4KeglWcxYV6zpDx1JDCoVVricaNQXw6cKkegJ4kpA_GyD2HnaQPU3ze&s=10" },
                    new Actor { MovieId = 3, Name = "Hwang Seung-eon", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQcRPmOCJVV9ru0X8Sqy-iuknvN9EsAWZpt4Tdxcz273GeQIVQcTIQt6ygUA4oE_4EoatZmA0v8ISxGwAaxfKkIx74m76I9U0LZ3o-B1kPGW1kkq0eHtIN08Zjt64uqPNrjhwqiqLdiUdM&s=19" },
                    new Actor { MovieId = 3, Name = "Choi Woo-sik", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcR6dfcvA7zOs6TRXPsFyp3RIt699SLWVPjI2bUPE2mXzG8O1S6fIFWkR7Gn2Hu6ILWfFI-oWKncwZgGl7mut9wmaBD71rhNsofqn7hhMWsaI_aPHO6FIuxzthTHhE2yHOwTxxhHTOLO_35B&s=19" },

                    // Phim 4: The Conjuring 
                    new Actor { MovieId = 4, Name = "Vera Farmiga", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIcPTbHCyUNeMyIvRS3THD5tpMMj29d_GHaUIetu9-GpSfqX9NANtbXNZcA7yEk2PEGu_CcwEcMBFsFy6GONPMecizc5Kn8Uhg9PN4bJDQ&s=10" },
                    new Actor { MovieId = 4, Name = "Patrick Wilson", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR0oMCaz1Dj-o23JWCV6iqv8F5mtT_kyy-h8WBnGwK--4brnM0gmxvBi-2BMEn7HfNUSKDb-AsfyusyMMs4RhvU2Rugqq7MuLAldqTufKi7A&s=10" },
                    new Actor { MovieId = 4, Name = "Sterling Jerins", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNftY15Bu3r4fvzq6rCARGiL2R3fs07Bve8rG-wwmaXk4rmahUi9QLBnjmpbk1MgW0r2VEAb-E4hCNlAzFFy0coL3ADOpjyTO2mcfjUKSH1A&s=10" },
                    new Actor { MovieId = 4, Name = "Joey King", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZ92qx6xPCQFiKqTBqMYbZ_NR4_2ZXRWSachU6eUSYspcVUvcWMxXnqW4BBTqORjRc8TyUo4l97I2y9CU4fY-HLureNuCG00nzLEaIrt5ejw&s=10" },
                    new Actor { MovieId = 4, Name = "Shannon Kook", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2KHC2esL6Qy5oAa0WHRDzOiW0NqAI7Y0AAIs_N4MYePQjmn8IOs0o4B-FXS_oW__tx4y-onvzO3jr7aRkGuWzklDp4YXziBIJXCsHd0KuNQ&s=10" },
                    new Actor { MovieId = 4, Name = "Ron Livingston", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIt8u8ePn6GVGqBlqchVBJp8GaAvQo399gi2extOdhR3LRMpCKG84LRkiXEMYXhkDHeEXK_Qdt02U7PI7maSAl0AOIOiG9AZzTXWxhRo6f&s=10" },

                    // Phim5: Exhuma
                    new Actor { MovieId = 5, Name = "Kim Go-eun", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcRmiyVSa4OyMnMKWZTyZYlDvP24imsguzfeILzyH2SgMqAjv1ZCY1PVWO3WlpI08sRdzB21N3pVFlxl6Q3A8doIyb6sjqXiPksGdan7BGmvg88H9cEARem1t_KxPWwLYzSIrQ0_nLSET070&s=19" },
                    new Actor { MovieId = 5, Name = "Lee Do-hyun", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcSof2NUs3MO5RHHzMcfnBttVFVfGjEn7P_ocrDLQjb6dJd0G7fwwQqb1iduSpwAXJ3E6o1DXta02pWI2D4bT4vhqNkpRuGav-tM9CgePzMBSpO3mHLbXQEitcaV20kQ92m4WTSNELUMVtIg&s=19" },
                    new Actor { MovieId = 5, Name = "Yu Hae-jin", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcS_pGk8qFdu81BP16NCXjpWMJaVpjruw1Ib1zYxBpIh1qzET3Fj3YPMzoSWI17_t3eEy46TP4lauwfCuKvpkYKD17gpKa9lLZIFvx0FJDJMJ9KCms2S3w-XpAQaLOsjRK2YzTxQYTvjaUs&s=19" },
                    new Actor { MovieId = 5, Name = "Choi Min-sik", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcT4JIU4CBKRVozMsAmeoE4gkXybjv52F4HyPmq_xSoMTWSn-MORk1gh_ehvJBYnmnFjblipIjwzQDXahuZ0Dt6ASs0_JaJREhNP5nwQyTSAX-Z-Q-dPtqJ2iVBfXQ7yuc5ums6Ut98pOG5i&s=19" },
                    new Actor { MovieId = 5, Name = "Kim Ji-an", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrq5XYLnWXSPVgCvjj_PtnHloS9V_ARy9hciJIm7SNi2vuxGs1smPR2_vxt6t80aIad0NW356mzB_4DTbSfi5pkNcLpxzI6ABXFc9ldl2y&s=10" },
                    new Actor { MovieId = 5, Name = "Jung Yun-ha", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbX31FN-qJlBerkuiLMc6_sJZyjuXJ6tiHI3zmFgSS-V8vjF7HyliJOHBJtlEKi2806WvpTNiOqDglCWiBfuyvj1DfYnQAoZlYs3sCDOdx&s=10" },
                    new Actor { MovieId = 5, Name = "Lee Yeong-ran", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQw-Eper1k6HF29sgE6ibyhTcc3pAUGIpWlZn8O8hvlJ8IqUoOK9ZQgUbMthQB8d-14SHMsymIVmaFFEbVUWvf_0m1W5saGavLhqpoJ6Nei&s=10" },

                    //Phim 6: Inside Out 2 
                    new Actor { MovieId = 6, Name = "Maya Hawke", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFOehykulnWXUav12oAn2e3BS7rKh7DlTHkLhsWhus8zpqPKL37Kc-q0fiZDBdO2xtF9a-WFnQ_yyOTKxhaEXYlplPX2g7F1DlxG6wl_GYKA&s=10" },
                    new Actor { MovieId = 6, Name = "Lilimar", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGqUy6-QWM494fdcXLAF2McHLOuxwLV0NZ_oBeBPEW-8dOzUQBp9XBBr2-dL2T2BNPJW1v0MmTOOBZJTf6YZw9Y1ystYtev_wJm4M_Mf3r&s=10" },
                    new Actor { MovieId = 6, Name = "Adèle Exarchopoulos", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZumgqICcoX24qYg0_DH9rbhqSwa_v0puunvPtM-VolOUcz__sww4JgIhyT3Hq_iTpvtJWuhM-O5yXQMR1k0Z1-vG7F5WLXFlxAZvZqfxR&s=10" },
                    new Actor { MovieId = 6, Name = "Kensington Tallman", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNqp7EyE2r1m4McZ6m_h-UtE4hQDVX9Bgl2bddhPx2E5V3yiv8tYZOW1LZ-bBxrVXHZumREDiT5XdQs1ykL7fdurrUiSi67snPq5usAmqQBQ&s=10" },
                    new Actor { MovieId = 6, Name = "Ayo Edebiri", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStPj_UVldrFUUP5BeFbxQhNM8WgIrSzhhhCp17A5Lq95K32a4sThNaH2eIrNEwiUd1P1me3wY0wySt0j5PVAUCpVIh8_NJZ5BrGwTCPNl4&s=10" },
                    new Actor { MovieId = 6, Name = "June Squibb", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZ60U642-2yjKN37FKhmMrLfn35VJs_0y8uC3vuM9T5OEruHHAOXtq8irB4O8wHC0T_PEh3nP1fPueVHtcoqsTjZmQ1pv79jtBUlh17M8haw&s=10" },
                    new Actor { MovieId = 6, Name = "Tony Hale", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgntEBdlyHRzKRvMM5QFMfR_HDsuPS6lkSNHF-QQCXhUO5dEKppqocjLHBjy8dMITgo8ASj35Aye_VCHtEez1oQCxC8l8gRont8pZ3ri42&s=10" },
                    new Actor { MovieId = 6, Name = "Ron Funches", Biography = "", AvatarUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-zyPAUgZAAO3o5Q1xbXSN40vrc3fG8ewetajKKffoseiP4AWp6zqf0yWHnybAh-PjHkdYYMhgMwby-SrWNp0FlkVEpHsDvNkeZOWrnZLw&s=10" }
                };

                _context.Actors.AddRange(actorsList);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Bơm dữ liệu thành công: Rạp, Phòng, Ghế, Bắp Nước, và toàn bộ Diễn viên xịn sò cho 6 phim!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi rồi sếp ơi: {ex.Message}");
            }
        }

        [HttpPost("seed-showtimes-only")]
        public async Task<IActionResult> SeedShowtimesOnly()
        {
            try
            {
                // Xóa suất chiếu cũ để không bị trùng lặp
                _context.Showtimes.RemoveRange(_context.Showtimes);
                await _context.SaveChangesAsync();

                // Lấy danh sách các phòng hiện có trong DB
                var rooms = await _context.Rooms.ToListAsync();
                if (!rooms.Any()) 
                    return BadRequest(new { Message = "Chưa có phòng nào trong CSDL! Hãy thêm rạp và phòng trước." });

                // Tìm ngẫu nhiên các phòng (nếu không khớp tên thì lấy đại phòng đầu tiên)
                var roomCGV_1 = rooms.FirstOrDefault(r => r.Name.Contains("IMAX")) ?? rooms[0];
                var roomCGV_2 = rooms.FirstOrDefault(r => r.Name.Contains("2D Thường")) ?? rooms[0];
                var roomBHD_1 = rooms.FirstOrDefault(r => r.Name.Contains("2D") && !r.Name.Contains("Thường")) ?? rooms[0];
                var roomBHD_2 = rooms.FirstOrDefault(r => r.Name.Contains("3D")) ?? rooms[0];
                var roomBeta_1 = rooms.FirstOrDefault(r => r.Name.Contains("Cơ Bản")) ?? rooms[0];
                var roomBeta_2 = rooms.FirstOrDefault(r => r.Name.Contains("VIP")) ?? rooms.Last();

                var showtimes = new List<Showtime>();
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var nextDay = today.AddDays(2);

                // ============ PHIM 1 ============
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(9).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = today.AddHours(14).AddMinutes(15), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_1.Id, StartTime = today.AddHours(14), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(19).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_2.Id, StartTime = today.AddHours(22).AddMinutes(15), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomBeta_2.Id, StartTime = tomorrow.AddHours(10).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 1, RoomId = roomCGV_1.Id, StartTime = tomorrow.AddHours(20), BasePrice = 90000 });

                // ============ PHIM 2 ============
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

                // ============ PHIM 3 ============ 
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(10), BasePrice = 70000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = today.AddHours(20).AddMinutes(30), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomCGV_2.Id, StartTime = today.AddHours(16).AddMinutes(45), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(13).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBeta_1.Id, StartTime = tomorrow.AddHours(19), BasePrice = 85000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_1.Id, StartTime = nextDay.AddHours(15), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 3, RoomId = roomBHD_2.Id, StartTime = nextDay.AddHours(22), BasePrice = 85000 });

                // ============ PHIM 4 ============ 
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomCGV_1.Id, StartTime = today.AddHours(18).AddMinutes(15), BasePrice = 90000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBeta_2.Id, StartTime = today.AddHours(21), BasePrice = 80000 });
                showtimes.Add(new Showtime { MovieId = 4, RoomId = roomBHD_2.Id, StartTime = tomorrow.AddHours(14), BasePrice = 85000 });

                // ============ PHIM 5 ============ 
                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomBeta_1.Id, StartTime = today.AddHours(17).AddMinutes(30), BasePrice = 75000 });
                showtimes.Add(new Showtime { MovieId = 5, RoomId = roomCGV_2.Id, StartTime = tomorrow.AddHours(20).AddMinutes(15), BasePrice = 85000 });

                _context.Showtimes.AddRange(showtimes);
                await _context.SaveChangesAsync();

                return Ok(new { Message = $"Đã tạo thành công {showtimes.Count} suất chiếu phân bổ cho các phòng!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Đã xảy ra lỗi: " + ex.Message });
            }
        }
    }
}
