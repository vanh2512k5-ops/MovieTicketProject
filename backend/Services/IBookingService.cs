using MovieTicketAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MovieTicketAPI.Services
{
    public interface IBookingService
    {
        Task<(bool Success, string Message, int? BookingId, List<int>? ConflictedSeats)> HoldSeatsAsync(int userId, int showtimeId, List<int> seatIds);
        Task<(bool Success, string Message, int? BookingId, decimal TotalPrice, string? QrUrl, List<int>? ConflictedSeats)> CreateBookingAsync(int userId, int showtimeId, List<int> seatIds, List<MovieTicketAPI.DTOs.ComboRequest> combos);
        Task<(bool Success, string Message)> CancelBookingAsync(int userId, int bookingId);
    }
}
