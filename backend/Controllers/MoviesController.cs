using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Minio;
using Minio.DataModel.Args;
using MovieTicketAPI.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
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

        [HttpGet]
        public async Task<IActionResult> GetAllMovies()
        {
            var movies = await _context.Movies.ToListAsync();
            return Ok(movies);
        }

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
                query = query.Where(m => m.Genre != null && m.Genre.Contains(genre));
            }

            var results = await query.ToListAsync();
            return Ok(results);
        }

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

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateMovie([FromBody] Movie movie)
        {
            _context.Movies.Add(movie);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMovieById), new { id = movie.Id }, movie);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("../Reviews")]
        public async Task<IActionResult> PostReview([FromBody] Review review)
        {
            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            return Ok(review);
        }

        // 6. NÉN ẢNH VÀ UPLOAD LÊN MINIO
        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/upload-poster")]
        public async Task<IActionResult> UploadPoster(int id, IFormFile file, [FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var movie = await _context.Movies.FindAsync(id);
            if (movie == null) return NotFound("Không tìm thấy phim!");
            if (file == null || file.Length == 0) return BadRequest("Vui lòng chọn file ảnh.");

            try
            {
                var bucketName = config["Minio:BucketName"] ?? "movietickets";
                var objectName = $"{id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.webp";

                using var outStream = new MemoryStream();
                using (var image = await Image.LoadAsync(file.OpenReadStream()))
                {
                    image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(800, 0), Mode = ResizeMode.Max }));
                    await image.SaveAsWebpAsync(outStream, new WebpEncoder { Quality = 75 });
                }
                outStream.Position = 0;

                var putObjectArgs = new PutObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectName)
                    .WithStreamData(outStream)
                    .WithObjectSize(outStream.Length)
                    .WithContentType("image/webp");

                await minioClient.PutObjectAsync(putObjectArgs).ConfigureAwait(false);

                // CHỈ LƯU LINK TƯƠNG ĐỐI
                movie.PosterUrl = $"/{bucketName}/{objectName}";
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Upload thành công!", PosterUrl = movie.PosterUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        // 7. THÊM DIỄN VIÊN KÈM ẢNH \
        [Authorize(Roles = "Admin")]
        [HttpPost("{movieId}/actors")]
        public async Task<IActionResult> AddActor(
            int movieId, [FromForm] string name, [FromForm] string biography, IFormFile file,
            [FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var movie = await _context.Movies.FindAsync(movieId);
            if (movie == null) return NotFound("Không tìm thấy phim!");
            if (file == null || file.Length == 0) return BadRequest("Vui lòng chọn ảnh.");

            try
            {
                var bucketName = config["Minio:BucketName"] ?? "movietickets";
                var objectName = $"actor_{movieId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.webp";

                using var outStream = new MemoryStream();
                using (var image = await Image.LoadAsync(file.OpenReadStream()))
                {
                    image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(400, 400), Mode = ResizeMode.Crop }));
                    await image.SaveAsWebpAsync(outStream, new WebpEncoder { Quality = 75 });
                }
                outStream.Position = 0;

                var putObjectArgs = new PutObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectName)
                    .WithStreamData(outStream)
                    .WithObjectSize(outStream.Length)
                    .WithContentType("image/webp");

                await minioClient.PutObjectAsync(putObjectArgs).ConfigureAwait(false);

                // CHỈ LƯU LINK TƯƠNG ĐỐI
                var actor = new Actor { MovieId = movieId, Name = name, Biography = biography, AvatarUrl = $"/{bucketName}/{objectName}" };
                _context.Actors.Add(actor);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Thêm diễn viên thành công!", Actor = actor });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi server: {ex.Message}");
            }
        }

        // 8. HÀM "RỬa ẢNH" TỰ ĐỘNG: WEB LINK -> COMPRESS -> MINIO (LƯU TƯƠNG ĐỐI)
        [Authorize(Roles = "Admin")]
        [HttpPost("migrate-actors-to-minio")]
        public async Task<IActionResult> MigrateActorsToMinio([FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var actors = await _context.Actors.ToListAsync();
            var bucketName = config["Minio:BucketName"] ?? "movietickets";
            int count = 0;

            using var httpClient = new HttpClient();

            foreach (var actor in actors)
            {
                // Bỏ qua nếu đã là link MinIO tương đối (bắt đầu bằng /movietickets)
                if (string.IsNullOrEmpty(actor.AvatarUrl) || actor.AvatarUrl.StartsWith($"/{bucketName}"))
                    continue;

                try
                {
                    byte[] imageBytes;
                    if (actor.AvatarUrl.StartsWith("data:image"))
                    {
                        var base64Data = actor.AvatarUrl.Substring(actor.AvatarUrl.IndexOf(",") + 1);
                        imageBytes = Convert.FromBase64String(base64Data);
                    }
                    else
                    {
                        imageBytes = await httpClient.GetByteArrayAsync(actor.AvatarUrl);
                    }

                    using var inStream = new MemoryStream(imageBytes);
                    using var outStream = new MemoryStream();
                    using (var image = await Image.LoadAsync(inStream))
                    {
                        image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(400, 400), Mode = ResizeMode.Crop }));
                        await image.SaveAsWebpAsync(outStream, new WebpEncoder { Quality = 75 });
                    }
                    outStream.Position = 0;

                    var objectName = $"actor_migrated_{actor.Id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.webp";
                    var putObjectArgs = new PutObjectArgs()
                        .WithBucket(bucketName)
                        .WithObject(objectName)
                        .WithStreamData(outStream)
                        .WithObjectSize(outStream.Length)
                        .WithContentType("image/webp");

                    await minioClient.PutObjectAsync(putObjectArgs);

                    // CHỈ LƯU LINK TƯƠNG ĐỐI VÀO DB
                    actor.AvatarUrl = $"/{bucketName}/{objectName}";
                    count++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi migrate diễn viên {actor.Name}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = $"Đã 'MinIO hóa' thành công {count} diễn viên. Tất cả đã chuyển thành link tương đối!", Total = actors.Count });
        }

        // 9. HÀM "ÉP XUNG" POSTER: NÉN LẠI TOÀN BỘ POSTER CŨ SANG WEBP 800PX
        // Tạm thời tắt Authorize để bạn dễ dàng gọi từ Swagger
        // [Authorize(Roles = "Admin")]
        [HttpPost("compress-old-posters")]
        public async Task<IActionResult> CompressOldPosters([FromServices] IMinioClient minioClient, [FromServices] IConfiguration config)
        {
            var movies = await _context.Movies.ToListAsync();
            var bucketName = config["Minio:BucketName"] ?? "movietickets";
            int count = 0;

            using var httpClient = new HttpClient();

            foreach (var movie in movies)
            {
                if (string.IsNullOrEmpty(movie.PosterUrl) || movie.PosterUrl.EndsWith(".webp"))
                    continue; // Bỏ qua nếu chưa có ảnh hoặc đã nén thành webp rồi

                try
                {
                    byte[] imageBytes;
                    // Xử lý cả link cứng http://... và link tương đối /movietickets/...
                    // Fix triệt để: Nếu URL chứa IP cũ, ép nó về http://127.0.0.1:9000 để tải file cục bộ cho nhanh và không bị timeout
                    string fullUrl = movie.PosterUrl;
                    if (fullUrl.StartsWith("http"))
                    {
                        var uri = new Uri(fullUrl);
                        fullUrl = $"http://127.0.0.1:9000{uri.AbsolutePath}";
                    }
                    else if (fullUrl.StartsWith($"/{bucketName}"))
                    {
                        fullUrl = $"http://127.0.0.1:9000{fullUrl}";
                    }

                    imageBytes = await httpClient.GetByteArrayAsync(fullUrl);

                    using var inStream = new MemoryStream(imageBytes);
                    using var outStream = new MemoryStream();
                    using (var image = await Image.LoadAsync(inStream))
                    {
                        image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(800, 0), Mode = ResizeMode.Max }));
                        await image.SaveAsWebpAsync(outStream, new WebpEncoder { Quality = 75 });
                    }
                    outStream.Position = 0;

                    var objectName = $"poster_compressed_{movie.Id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.webp";
                    var putObjectArgs = new PutObjectArgs()
                        .WithBucket(bucketName)
                        .WithObject(objectName)
                        .WithStreamData(outStream)
                        .WithObjectSize(outStream.Length)
                        .WithContentType("image/webp");

                    await minioClient.PutObjectAsync(putObjectArgs);

                    // Ghi đè link mới vào DB
                    movie.PosterUrl = $"/{bucketName}/{objectName}";
                    count++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi nén poster phim {movie.Title}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = $"Đã nén thành công {count} Poster cũ sang định dạng WebP siêu nhẹ!", Total = movies.Count });
        }
    }
}