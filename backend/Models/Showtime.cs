namespace MovieTicketAPI.Models
{
    public class Showtime
    {
        public int Id { get; set; }
        public int MovieId { get; set; }
        public int RoomId { get; set; }
        public DateTime StartTime { get; set; }
        public decimal BasePrice { get; set; }

        public Movie? Movie { get; set; }
        public Room? Room { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}