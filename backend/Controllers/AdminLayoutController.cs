using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    // 1. DTO cho từng ô ghế
    public class SeatGridCellDto
    {
        public int GridRow { get; set; }
        public int GridColumn { get; set; }
        public SeatType Type { get; set; }
        public bool IsActive { get; set; }
    }

    // 2. DTO mới bọc toàn bộ Data (Bao gồm danh sách ghế + Hướng đánh số)
    public class SaveLayoutRequest
    {
        public string Direction { get; set; } // "LTR" (Left-to-Right) hoặc "RTL" (Right-to-Left)
        public List<SeatGridCellDto> Cells { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminLayoutController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public AdminLayoutController(MovieTicketContext context)
        {
            _context = context;
        }

        // API 1: LƯU SƠ ĐỒ GHẾ 
        [HttpPost("save-layout/{roomId}")]
        public async Task<IActionResult> SaveLayout(int roomId, [FromBody] SaveLayoutRequest request)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu!" });

            // KIỂM TRA LỊCH CHIẾU TƯƠNG LAI & LỊCH CẢI TẠO
            var currentTime = DateTime.Now;
            var hasFutureShowtimes = await _context.Showtimes.AnyAsync(s => s.RoomId == roomId && s.StartTime > currentTime);
            
            if (hasFutureShowtimes)
            {
                return BadRequest(new { message = "Không thể lưu sơ đồ! Phòng chiếu này đang có lịch chiếu ở tương lai. Vui lòng đặt lịch cải tạo sơ đồ để hệ thống tự động khóa phòng trước." });
            }

            if (room.IsUnderRenovation)
            {
                if (!room.RenovationScheduledAt.HasValue || DateTime.Now < room.RenovationScheduledAt.Value)
                {
                    return BadRequest(new { message = $"Phòng đang chờ đến thời điểm cải tạo sơ đồ ({room.RenovationScheduledAt?.ToString("dd/MM/yyyy HH:mm")}). Chưa thể sửa lúc này." });
                }
            }

            // 1. Lấy danh sách sơ đồ ghế cũ
            var oldSeats = await _context.Seats.Where(s => s.RoomId == roomId && !s.IsDeleted).ToListAsync();

            // 2. Tìm các ghế đã có vé (Tickets)
            var bookedSeatIds = await _context.Tickets
                .Where(t => oldSeats.Select(s => s.Id).Contains(t.SeatId))
                .Select(t => t.SeatId)
                .ToListAsync();

            // 3. Phân loại ghế để xóa
            var seatsToSoftDelete = oldSeats.Where(s => bookedSeatIds.Contains(s.Id)).ToList();
            var seatsToHardDelete = oldSeats.Where(s => !bookedSeatIds.Contains(s.Id)).ToList();

            // Thực hiện Soft Delete cho ghế có vé
            foreach (var seat in seatsToSoftDelete)
            {
                seat.IsDeleted = true;
            }

            // Thực hiện Hard Delete cho ghế chưa từng có vé
            _context.Seats.RemoveRange(seatsToHardDelete);

            var newSeats = new List<Seat>();

            // 2. Gom nhóm các ô theo từng hàng ngang từ trên xuống (0 -> N)
            var groupedByRow = request.Cells.OrderBy(c => c.GridRow).GroupBy(c => c.GridRow);

            char currentRowName = 'A';

            foreach (var rowGroup in groupedByRow)
            {
                int currentSeatNum = 1;
                bool hasRealSeatsInRow = false;

                //  LOGIC ĐẢO HƯỚNG 
                IEnumerable<SeatGridCellDto> orderedCols;
                if (request.Direction == "RTL")
                {
                    // Nếu Admin chọn Phải -> Trái: Đảo ngược thuật toán quét cột
                    orderedCols = rowGroup.OrderByDescending(c => c.GridColumn);
                }
                else
                {
                    // Mặc định Trái -> Phải
                    orderedCols = rowGroup.OrderBy(c => c.GridColumn);
                }

                foreach (var cell in orderedCols)
                {
                    var seat = new Seat
                    {
                        RoomId = roomId,
                        GridRow = cell.GridRow,
                        GridColumn = cell.GridColumn,
                        Type = cell.Type,
                        IsActive = cell.IsActive
                    };

                    if (cell.Type == SeatType.Empty)
                    {
                        seat.RowName = null;
                        seat.SeatNumber = 0;
                    }
                    else
                    {
                        seat.RowName = currentRowName.ToString();
                        seat.SeatNumber = currentSeatNum;

                        if (cell.Type == SeatType.Couple)
                        {
                            currentSeatNum += 2; // Ghế đôi chiếm 2 số
                        }
                        else
                        {
                            currentSeatNum++;
                        }
                        hasRealSeatsInRow = true;
                    }

                    newSeats.Add(seat);
                }

                if (hasRealSeatsInRow)
                {
                    currentRowName++;
                }

            }

            _context.Seats.AddRange(newSeats);
            room.IsLayoutConfigured = true;
            
            // Xóa trạng thái bảo trì nếu có
            room.IsUnderRenovation = false;
            room.RenovationScheduledAt = null;

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã lưu Layout. Hướng đánh số: {(request.Direction == "RTL" ? "Phải -> Trái" : "Trái -> Phải")}" });
        }

        // API 2: LẤY SƠ ĐỒ GHẾ CŨ ĐỂ CHỈNH SỬA
        [HttpGet("get-layout/{roomId}")]
        public async Task<IActionResult> GetLayout(int roomId)
        {
            // Tìm tất cả các ghế thuộc về phòng này, bỏ qua ghế đã xóa mềm
            var seats = await _context.Seats.Where(s => s.RoomId == roomId && !s.IsDeleted).ToListAsync();

            // Nếu phòng chưa từng được vẽ (trống), trả về mảng rỗng
            if (!seats.Any())
            {
                return Ok(new { cells = new List<object>() });
            }

            // Nếu đã có, trích xuất đúng tọa độ và trạng thái gửi về cho App tô màu
            var cells = seats.Select(s => new {
                gridRow = s.GridRow,
                gridColumn = s.GridColumn,
                type = s.Type,
                isActive = s.IsActive
            }).ToList();

            return Ok(new { cells });
        }

        [HttpGet("check-layout-update/{roomId}")]
        public async Task<IActionResult> CheckLayoutUpdate(int roomId)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu!" });

            var currentTime = DateTime.Now;
            var latestShowtime = await _context.Showtimes
                .Where(s => s.RoomId == roomId && s.StartTime > currentTime)
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync();

            if (latestShowtime != null)
            {
                return Ok(new
                {
                    canEditImmediately = false,
                    isAlreadyScheduled = room.IsUnderRenovation,
                    scheduledAt = room.RenovationScheduledAt,
                    latestShowtimeDate = latestShowtime.StartTime,
                    message = $"Phòng đang có lịch chiếu đến {latestShowtime.StartTime:dd/MM/yyyy HH:mm}. Việc sửa sơ đồ sẽ có hiệu lực sau thời gian này."
                });
            }

            return Ok(new
            {
                canEditImmediately = true,
                isAlreadyScheduled = false,
                message = "Phòng không có lịch chiếu tương lai. Bạn có thể sửa sơ đồ ngay."
            });
        }

        public class ScheduleRenovationRequest
        {
            public DateTime ScheduledAt { get; set; }
        }

        // API 4: ĐẶT LỊCH CẢI TẠO (KHÓA PHÒNG)
        [HttpPost("schedule-renovation/{roomId}")]
        public async Task<IActionResult> ScheduleRenovation(int roomId, [FromBody] ScheduleRenovationRequest request)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu!" });

            room.IsUnderRenovation = true;
            room.RenovationScheduledAt = request.ScheduledAt;

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã khóa phòng để cải tạo sơ đồ. Lịch cải tạo bắt đầu từ {request.ScheduledAt:dd/MM/yyyy HH:mm}." });
        }
    }
}