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
            if (room == null) return NotFound(new { message = "Không tìm thấy phòng chiếu!" }); // Sửa lại chuẩn JSON

            // 1. Lấy danh sách sơ đồ ghế cũ
            var oldSeats = _context.Seats.Where(s => s.RoomId == roomId);

            // THÁO NGÒI NỔ: KIỂM TRA KHÓA NGOẠI (FOREIGN KEY) 
            // Kiểm tra xem bảng Tickets có vé nào đang trỏ vào các ghế cũ này không
            // (Lưu ý: Nếu bảng vé của sếp tên là Orders hay Booking thì đổi chữ Tickets nhé)
            bool hasSoldTickets = await _context.Tickets.AnyAsync(t => oldSeats.Select(s => s.Id).Contains(t.SeatId));

            if (hasSoldTickets)
            {
                // Trả về mã lỗi 400 (BadRequest) kèm thông báo chặn đứng Admin
                return BadRequest(new { message = " CẢNH BÁO: Phòng này đã có khách mua vé! Không thể thay đổi sơ đồ để tránh lỗi hệ thống." });
            }

            // Nếu an toàn (chưa có vé), tiến hành xóa sạch để vẽ lại
            _context.Seats.RemoveRange(oldSeats);

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

                        currentSeatNum++;
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

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã lưu Layout. Hướng đánh số: {(request.Direction == "RTL" ? "Phải -> Trái" : "Trái -> Phải")}" });
        }

        // API 2: LẤY SƠ ĐỒ GHẾ CŨ ĐỂ CHỈNH SỬA
        [HttpGet("get-layout/{roomId}")]
        public async Task<IActionResult> GetLayout(int roomId)
        {
            // Tìm tất cả các ghế thuộc về phòng này
            var seats = await _context.Seats.Where(s => s.RoomId == roomId).ToListAsync();

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
    }
}