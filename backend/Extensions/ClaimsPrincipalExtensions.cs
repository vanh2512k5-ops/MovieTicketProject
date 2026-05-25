using System.Security.Claims;

namespace MovieTicketAPI.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Trích xuất an toàn UserId từ JWT Token (Claims).
        /// Trả về ID của người dùng nếu hợp lệ, ngược lại trả về null.
        /// Sử dụng extension này để chuẩn hóa việc lấy ID trên toàn bộ Controller.
        /// </summary>
        public static int? GetUserId(this ClaimsPrincipal user)
        {
            var userIdClaim = user.FindFirst("id")?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
            {
                return userId;
            }
            return null;
        }
    }
}
