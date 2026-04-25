using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        // Dependency Injection: Tự động tiêm Database vào Controller
        public MoviesController(MovieTicketContext context)
        {
            _context = context;
        }

        // GET: api/movies
        [HttpGet]
        public async Task<IActionResult> GetAllMovies()
        {
            // Lấy toàn bộ danh sách phim từ Database
            var movies = await _context.Movies.ToListAsync();
            return Ok(movies);
        }
        // POST: api/movies
        [HttpPost]
        public async Task<IActionResult> CreateMovie([FromBody] Movie movie)
        {
            // Thêm phim vào Database
            _context.Movies.Add(movie);
            // Lưu lại thay đổi
            await _context.SaveChangesAsync();

            // Trả về code 201 (Created) và thông tin phim vừa tạo
            return CreatedAtAction(nameof(GetAllMovies), new { id = movie.Id }, movie);
        }
    }

}