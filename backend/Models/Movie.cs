using Microsoft.AspNetCore.Mvc.ViewEngines;

namespace MovieTicketAPI.Models
{
    public class Movie
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Duration { get; set; } // Phút
        public string? PosterUrl { get; set; } // Lưu path của MinIO
        public DateTime ReleaseDate { get; set; }

        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}