using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;
using MovieTicketAPI.Services; // 1. Phải có dòng này

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

        [HttpPost]
        public async Task<IActionResult> PostReview([FromBody] Review review)
        {
            if (review == null) return BadRequest("Dữ liệu không hợp lệ!");

            review.CreatedAt = DateTime.Now;

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            // 🔥 4. ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT: Gọi tính toán lại điểm
            await _movieService.UpdateMovieRatingAsync(review.MovieId);

            return Ok(review);
        }

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