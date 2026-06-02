using System.Net.Sockets;

namespace MovieTicketAPI.Models
{
    public class Booking
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int ShowtimeId { get; set; }
        public DateTime BookingDate { get; set; } = DateTime.UtcNow;
        public decimal TotalPrice { get; set; }
        public string Status { get; set; } = MovieTicketAPI.Constants.BookingStatus.Pending;
        public string? BillId { get; set; }
        // Thời điểm booking Pending sẽ tự động hết hạn (null = không giới hạn)
        public DateTime? ExpiresAt { get; set; }

        public User? User { get; set; }
        public Showtime? Showtime { get; set; }
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
        public ICollection<BookingCombo> BookingCombos { get; set; } = new List<BookingCombo>();
    }
}