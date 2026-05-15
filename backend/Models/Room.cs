using System.Collections.Generic;

namespace MovieTicketAPI.Models
{
    public enum RoomType
    {
        Regular = 0,
        FirstClass = 1,
        IMAX = 2
    }

    public class Room
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string? Name { get; set; }
        public RoomType Type { get; set; }

        // ============ THÊM MỚI CHO DYNAMIC LAYOUT ============
        public int TotalRows { get; set; } // Tổng số hàng của lưới ma trận (VD: 15)
        public int TotalColumns { get; set; } // Tổng số cột của lưới ma trận (VD: 20)
        public bool IsLayoutConfigured { get; set; } = false; // Đánh dấu xem Admin đã vẽ sơ đồ chưa

        public Cinema? Cinema { get; set; }
        public ICollection<Seat>? Seats { get; set; }
        public ICollection<Showtime>? Showtimes { get; set; }
    }
}