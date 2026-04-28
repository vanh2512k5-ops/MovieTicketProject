using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Minio;
using Minio.DataModel.Args;
using MovieTicketAPI.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using System.Linq;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public MoviesController(MovieTicketContext context)
        {
            _context = context;
        }

        // 1. LẤY TẤT CẢ PHIM (Dùng cho trang chủ)
        [HttpGet]
        public async Task<IActionResult> GetAllMovies()
        {
            var movies = await _context.Movies.ToListAsync();
            return Ok(movies);
        }

        // 2. TÌM KIẾM VÀ LỌC PHIM (Khớp với thanh search và nút thể loại trên App)
        [HttpGet("search")]
        public async Task<IActionResult> SearchMovies(string? keyword, string? genre)
        {
            var query = _context.Movies.AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                query = query.Where(m => m.Title.Contains(keyword));
            }

            if (!string.IsNullOrEmpty(genre) && genre != "Tất cả")
            {
                query = query.Where(m => m.Genre == genre);
            }

            var results = await query.ToListAsync();
            return Ok(results);
        }

        // 3. LẤY CHI TIẾT PHIM THEO ID 
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMovieById(int id)
        {
            var movie = await _context.Movies
                .Include(m => m.Reviews)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (movie == null) return NotFound("Không tìm thấy phim!");

            return Ok(movie);
        }

        // 4. TẠO PHIM MỚI (Dùng cho Admin hoặc Swagger)
        [HttpPost]
        public async Task<IActionResult> CreateMovie([FromBody] Movie movie)
        {
            _context.Movies.Add(movie);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMovieById), new { id = movie.Id }, movie);
        }

        // 5. GỬI ĐÁNH GIÁ 
        [HttpPost("../Reviews")]
        public async Task<IActionResult> PostReview([FromBody] Review review)
        {
            // Gán thời gian hiện tại cho bình luận
            // review.CreatedAt = DateTime.Now; 

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            return Ok(review);
        }

        // 6. NÉN ẢNH VÀ UPLOAD LÊN MINIO 
        [HttpPost("{id}/upload-poster")]
        public async Task<IActionResult> UploadPoster(int id, IFormFile file, [FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound("Không tìm thấy phim!");
            if (file == null || file.Length == 0) return BadRequest("Vui lòng chọn file ảnh.");

            try
            {
                var bucketName = config["Minio:BucketName"] ?? "movietickets";
                var objectName = $"{id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.jpg";

                using var outStream = new MemoryStream();
                using (var image = await Image.LoadAsync(file.OpenReadStream()))
                {
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Size = new Size(800, 0),
                        Mode = ResizeMode.Max
                    }));
                    await image.SaveAsJpegAsync(outStream, new JpegEncoder { Quality = 75 });
                }
                outStream.Position = 0;

                var putObjectArgs = new PutObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectName)
                    .WithStreamData(outStream)
                    .WithObjectSize(outStream.Length)
                    .WithContentType("image/jpeg");

                await minioClient.PutObjectAsync(putObjectArgs).ConfigureAwait(false);

                // ÉP CỨNG IP ĐỂ APP ĐIỆN THOẠI XEM ĐƯỢC
                string externalIp = "172.20.10.3";
                movie.PosterUrl = $"http://{externalIp}:9000/{bucketName}/{objectName}";

                await _context.SaveChangesAsync();

                return Ok(new { Message = "Upload thành công!", PosterUrl = movie.PosterUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }
    }
}