using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public ReviewsController(MovieTicketContext context)
        {
            _context = context;
        }

        // TẠO ĐÁNH GIÁ MỚI 
        [HttpPost]
        public async Task<IActionResult> PostReview([FromBody] Review review)
        {
            if (review == null) return BadRequest("Dữ liệu không hợp lệ!");

            // Tự động lấy giờ hệ thống lúc người dùng bấm gửi
            review.CreatedAt = DateTime.Now;

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(review);
        }

        // 2. THẢ TIM 
        [HttpPost("{id}/like")]
        public async Task<IActionResult> LikeReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound("Không tìm thấy đánh giá!");

            // Tăng số lượt tim lên 1
            review.LikeCount += 1;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đã thả tim thành công!", LikeCount = review.LikeCount });
        }
    }
}