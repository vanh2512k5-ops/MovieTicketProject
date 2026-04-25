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
        public string Status { get; set; } = "Pending"; // Pending, Paid, Cancelled

        public User? User { get; set; }
        public Showtime? Showtime { get; set; }
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }
}