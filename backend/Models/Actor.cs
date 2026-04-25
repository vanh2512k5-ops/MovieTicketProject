namespace MovieTicketAPI.Models
{
    public class Actor
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; } // Path MinIO
        public string Biography { get; set; } = string.Empty;
    }
}