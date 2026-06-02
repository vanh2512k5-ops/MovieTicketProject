using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using MovieTicketAPI.Services; // 1. Phải có dòng này
using System.Security.Claims;
using MovieTicketAPI.Extensions;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MovieTicketContext _context;
        private readonly IMovieService _movieService; // 2. Khai báo Service

        // 3. Inject Service vào Constructor
        public ReviewsController(MovieTicketContext context, IMovieService movieService)
        {
            _context = context;
            _movieService = movieService;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> PostReview([FromBody] Review review)
        {
            if (review == null) return BadRequest("Dữ liệu không hợp lệ!");

            var currentUserId = User.GetUserId();
            if (currentUserId == null) return Unauthorized(new { Message = "Không thể xác thực người dùng." });
            int userId = currentUserId.Value;

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return Unauthorized(new { Message = "Người dùng không tồn tại." });
            }

            // Validation 1: Phải có vé đã thanh toán cho phim này
            var hasPaidBooking = await _context.Bookings
                .Include(b => b.Showtime)
                .AnyAsync(b => b.UserId == userId
                            && b.Status == "Paid"
                            && b.Showtime != null
                            && b.Showtime.MovieId == review.MovieId);

            if (!hasPaidBooking)
                return BadRequest(new { Message = "Bạn cần mua vé và xem phim này mới có thể đánh giá!" });

            // Validation 2: Chưa review phim này trước đó
            var alreadyReviewed = await _context.Reviews
                .AnyAsync(r => r.UserId == userId && r.MovieId == review.MovieId);

            if (alreadyReviewed)
                return BadRequest(new { Message = "Bạn đã đánh giá phim này rồi!" });

            // Ghi đè thông tin người dùng từ token để chống giả mạo
            review.UserId = userId;
            review.UserName = user.FullName;
            review.CreatedAt = DateTime.UtcNow;

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            // 🔥 4. ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT: Gọi tính toán lại điểm
            await _movieService.UpdateMovieRatingAsync(review.MovieId);

            return Ok(review);
        }

        [Authorize]
        [HttpPost("{id}/like")]
        public async Task<IActionResult> LikeReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound("Không tìm thấy đánh giá!");

            review.LikeCount += 1;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đã thả tim thành công!", LikeCount = review.LikeCount });
        }
    }
}