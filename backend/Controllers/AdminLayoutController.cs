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
    public class AdminLayoutController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public AdminLayoutController(MovieTicketContext context)
        {
            _context = context;
        }

        [HttpPost("save-layout/{roomId}")]
        public async Task<IActionResult> SaveLayout(int roomId, [FromBody] SaveLayoutRequest request)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null) return NotFound("Không tìm thấy phòng chiếu!");

            // 1. Xóa sạch sơ đồ ghế cũ
            var oldSeats = _context.Seats.Where(s => s.RoomId == roomId);
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
    }
}