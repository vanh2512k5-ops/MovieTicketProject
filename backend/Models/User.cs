namespace MovieTicketAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty; // Lưu mật khẩu đã mã hóa
        public string? Phone { get; set; }
        public string Role { get; set; } = "User"; // Mặc định là User, sau này có "Admin"

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Quan hệ với bảng khác
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}