namespace MovieTicketAPI.Models
{
    public class BookingCombo
    {
        public int Id { get; set; }
        public int BookingId { get; set; }
        public int ComboId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; } // Giá tại thời điểm đặt

        public Booking? Booking { get; set; }
        public Combo? Combo { get; set; }
    }
}
