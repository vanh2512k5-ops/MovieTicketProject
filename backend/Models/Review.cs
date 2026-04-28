using System.Text.Json.Serialization;

namespace MovieTicketAPI.Models
{
    public class Review
    {
        public int Id { get; set; }
        public int MovieId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public int? UserId { get; set; }

        public int Rating { get; set; } 
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public Movie? Movie { get; set; }

        [JsonIgnore]
        public User? User { get; set; }

        public int LikeCount { get; set; } = 0;
    }
}