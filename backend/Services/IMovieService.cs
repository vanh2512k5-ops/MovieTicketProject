namespace MovieTicketAPI.Services
{
    public interface IMovieService
    {
        Task UpdateMovieRatingAsync(int movieId);
    }
}