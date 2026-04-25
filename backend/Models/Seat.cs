namespace MovieTicketAPI.Models
{
    public enum SeatType { Normal, VIP, Couple, Aisle } // Aisle dùng để cắt lối đi

    public class Seat
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public string Row { get; set; } = string.Empty; // A, B, C
        public int Number { get; set; } // 1, 2, 3
        public SeatType Type { get; set; }

        public Room? Room { get; set; }
    }
}