using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Services
{
    public class MovieService : IMovieService
    {
        private readonly MovieTicketContext _context;
        public MovieService(MovieTicketContext context) { _context = context; }

        public async Task UpdateMovieRatingAsync(int movieId)
        {
            var reviews = await _context.Reviews
                .Where(r => r.MovieId == movieId)
                .ToListAsync();

            var movie = await _context.Movies.FindAsync(movieId);
            if (movie != null)
            {
                if (reviews.Any())
                {
                    // Thuật toán tính trung bình và làm tròn 1 chữ số thập phân
                    movie.AverageRating = Math.Round(reviews.Average(r => r.Rating), 1);
                    movie.TotalReviews = reviews.Count;
                }
                else
                {
                    movie.AverageRating = 0;
                    movie.TotalReviews = 0;
                }
                await _context.SaveChangesAsync();
            }
        }
    }
}