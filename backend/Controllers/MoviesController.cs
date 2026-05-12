using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Minio;
using Minio.DataModel.Args;
using MovieTicketAPI.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using System.Linq;
using System.Net.Http;

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
                .Include(m => m.Actors)
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

        // 7. THÊM DIỄN VIÊN KÈM ẢNH (NÉN & UPLOAD MINIO)
        [HttpPost("{movieId}/actors")]
        public async Task<IActionResult> AddActor(
            int movieId,
            [FromForm] string name,
            [FromForm] string biography,
            IFormFile file,
            [FromServices] IMinioClient minioClient,
            [FromServices] IConfiguration config)
        {
            var movie = await _context.Movies.FindAsync(movieId);
            if (movie == null) return NotFound("Không tìm thấy phim!");
            if (file == null || file.Length == 0) return BadRequest("Vui lòng chọn ảnh đại diện cho diễn viên.");

            try
            {
                var bucketName = config["Minio:BucketName"] ?? "movietickets";
                var objectName = $"actor_{movieId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.jpg";

                using var outStream = new MemoryStream();
                using (var image = await Image.LoadAsync(file.OpenReadStream()))
                {
                    // Resize và Crop vuông 400x400 cho Avatar
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Size = new Size(400, 400),
                        Mode = ResizeMode.Crop
                    }));
                    // Nén chất lượng 75%
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

                string externalIp = "172.20.10.3";
                var avatarUrl = $"http://{externalIp}:9000/{bucketName}/{objectName}";

                var actor = new Actor
                {
                    MovieId = movieId,
                    Name = name,
                    Biography = biography,
                    AvatarUrl = avatarUrl
                };

                _context.Actors.Add(actor);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Thêm diễn viên thành công!", Actor = actor });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        // 8.WEB LINK -> COMPRESS -> MINIO
        [HttpPost("migrate-actors-to-minio")]
        public async Task<IActionResult> MigrateActorsToMinio([FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var actors = await _context.Actors.ToListAsync();
            var bucketName = config["Minio:BucketName"] ?? "movietickets";
            string externalIp = "172.20.10.3";
            int count = 0;

            using var httpClient = new HttpClient();

            foreach (var actor in actors)
            {
                // Chỉ xử lý những ảnh còn là link web (gstatic, pravatar) hoặc base64
                if (string.IsNullOrEmpty(actor.AvatarUrl) || actor.AvatarUrl.Contains(externalIp)) 
                    continue;

                try
                {
                    byte[] imageBytes;

                    // Xử lý riêng nếu link là chuỗi Base64 (như ảnh của Chadwick Boseman)
                    if (actor.AvatarUrl.StartsWith("data:image"))
                    {
                        var base64Data = actor.AvatarUrl.Substring(actor.AvatarUrl.IndexOf(",") + 1);
                        imageBytes = Convert.FromBase64String(base64Data);
                    }
                    else
                    {
                        // 1. Tải ảnh từ web về
                        imageBytes = await httpClient.GetByteArrayAsync(actor.AvatarUrl);
                    }
                    
                    using var inStream = new MemoryStream(imageBytes);

                    // 2. NÉN ẢNH (Dùng đúng logic nén 75% của sếp)
                    using var outStream = new MemoryStream();
                    using (var image = await Image.LoadAsync(inStream))
                    {
                        image.Mutate(x => x.Resize(new ResizeOptions {
                            Size = new Size(400, 400),
                            Mode = ResizeMode.Crop
                        }));
                        await image.SaveAsJpegAsync(outStream, new JpegEncoder { Quality = 75 });
                    }
                    outStream.Position = 0;

                    // 3. ĐẨY LÊN MINIO
                    var objectName = $"actor_migrated_{actor.Id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.jpg";
                    var putObjectArgs = new PutObjectArgs()
                        .WithBucket(bucketName)
                        .WithObject(objectName)
                        .WithStreamData(outStream)
                        .WithObjectSize(outStream.Length)
                        .WithContentType("image/jpeg");

                    await minioClient.PutObjectAsync(putObjectArgs);

                    // 4. CẬP NHẬT LẠI DATABASE
                    actor.AvatarUrl = $"http://{externalIp}:9000/{bucketName}/{objectName}";
                    count++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi migrate diễn viên {actor.Name}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = $"Đã 'MinIO hóa' thành công {count} diễn viên!", Total = actors.Count });
        }
    }
}