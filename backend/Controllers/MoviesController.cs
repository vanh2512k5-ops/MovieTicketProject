using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Minio;
using Minio.DataModel.Args;
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

            // Trả về code 201 và thông tin phim vừa tạo
            return CreatedAtAction(nameof(GetAllMovies), new { id = movie.Id }, movie);
        }
        // POST: api/movies/{id}/upload-poster
        [HttpPost("{id}/upload-poster")]
        public async Task<IActionResult> UploadPoster(int id, IFormFile file, [FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            // Kiểm tra phim có tồn tại không
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound("Không tìm thấy phim!");

            //Kiểm tra file hợp lệ
            if (file == null || file.Length == 0) return BadRequest("Vui lòng chọn một file ảnh.");

            try
            {
                var bucketName = config["Minio:BucketName"] ?? "movietickets";

                // Đổi tên file để không bị trùng 
                var extension = Path.GetExtension(file.FileName);
                var objectName = $"{id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{extension}";

                // Đọc luồng file và đẩy lên MinIO
                using (var stream = file.OpenReadStream())
                {
                    var putObjectArgs = new PutObjectArgs()
                        .WithBucket(bucketName)
                        .WithObject(objectName)
                        .WithStreamData(stream)
                        .WithObjectSize(stream.Length)
                        .WithContentType(file.ContentType);

                    await minioClient.PutObjectAsync(putObjectArgs).ConfigureAwait(false);
                }

                // Cập nhật đường dẫn ảnh vào Database
                movie.PosterUrl = $"http://localhost:9000/{bucketName}/{objectName}";
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Upload thành công!", PosterUrl = movie.PosterUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server khi upload: {ex.Message}");
            }
        }
    }

}