namespace MovieTicketAPI.Models
{
    public enum RoomType { Regular, FirstClass } // Hỗ trợ chia loại phòng

    public class Room
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string Name { get; set; } = string.Empty;
        public RoomType Type { get; set; }

        public Cinema? Cinema { get; set; }
        public ICollection<Seat> Seats { get; set; } = new List<Seat>();
        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
    }
}