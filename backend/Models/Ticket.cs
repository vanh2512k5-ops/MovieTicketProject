namespace MovieTicketAPI.Models
{
    public class Ticket
    {
        public int Id { get; set; }
        public int BookingId { get; set; }
        public int SeatId { get; set; }
        public decimal Price { get; set; }

        public Booking? Booking { get; set; }
        public Seat? Seat { get; set; }
    }
}