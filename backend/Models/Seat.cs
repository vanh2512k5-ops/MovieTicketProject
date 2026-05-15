namespace MovieTicketAPI.Models
{
    public enum SeatType
    {
        Normal = 0,   // Ghế thường
        VIP = 1,      // Ghế VIP
        Couple = 2,   // Ghế đôi
        Empty = 3,    // Khoảng trống 
        Locked = 4    // Ghế bị hỏng/Bảo trì 
    }

    public class Seat
    {
        public int Id { get; set; }
        public int RoomId { get; set; }

        // Tọa độ trong ma trận
        public int GridRow { get; set; }    // Tọa độ Y (Hàng số mấy trong lưới, từ 0 -> TotalRows - 1)
        public int GridColumn { get; set; } // Tọa độ X (Cột số mấy trong lưới, từ 0 -> TotalColumns - 1)

        // Thông tin hiển thị
        public string? RowName { get; set; } // Tên hiển thị (Ví dụ: "A", "B", "C"). Cho phép null nếu là Empty
        public int SeatNumber { get; set; }  // Số ghế hiển thị (Ví dụ: 1, 2, 3). Có thể bằng 0 nếu là Empty

        // Thuộc tính của ghế
        public SeatType Type { get; set; }
        public bool IsActive { get; set; } = true; // true: Mở bán bình thường, false: Bị khóa/Bảo trì

        public Room? Room { get; set; }
    }
}