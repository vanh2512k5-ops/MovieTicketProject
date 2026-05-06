using System.ComponentModel.DataAnnotations;

namespace MovieTicketAPI.Models
{
    public class Movie
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public int Duration { get; set; }  


        public string? Genre { get; set; } 

        public double Rating { get; set; }
        public double AverageRating { get; set; } = 0.0;
        public int TotalReviews { get; set; } = 0;      

        public string? AgeRestriction { get; set; } 

        public string? PosterUrl { get; set; } 

        public DateTime ReleaseDate { get; set; }


        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}