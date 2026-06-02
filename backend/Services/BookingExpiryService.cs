using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Services
{
    /// <summary>
    /// Background service chạy mỗi phút để tự động hủy các booking Pending đã quá hạn.
    /// Đây là giải pháp chuẩn của .NET (IHostedService) thay thế cho cron job bên ngoài.
    /// </summary>
    public class BookingExpiryService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingExpiryService> _logger;

        // Khoảng thời gian chờ giữa mỗi lần chạy (1 phút)
        private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(1);

        public BookingExpiryService(IServiceScopeFactory scopeFactory, ILogger<BookingExpiryService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[BookingExpiryService] Service started. Will check every {Interval}.", CheckInterval);

            // Chạy vô hạn cho đến khi app tắt
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ExpireStaleBookingsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    // Không để lỗi làm crash service
                    _logger.LogError(ex, "[BookingExpiryService] Error while expiring stale bookings.");
                }

                // Chờ đến lần check tiếp theo
                await Task.Delay(CheckInterval, stoppingToken);
            }

            _logger.LogInformation("[BookingExpiryService] Service stopped.");
        }

        private async Task ExpireStaleBookingsAsync(CancellationToken cancellationToken)
        {
            // Tạo scope riêng vì DbContext là Scoped, không thể inject trực tiếp vào Singleton
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<MovieTicketContext>();

            var now = DateTime.UtcNow;

            // Lấy danh sách tất cả booking Pending đã vượt quá ExpiresAt
            var expiredBookings = await context.Bookings
                .Where(b => b.Status == MovieTicketAPI.Constants.BookingStatus.Pending
                         && b.ExpiresAt != null
                         && b.ExpiresAt < DateTime.UtcNow)
                .ToListAsync(cancellationToken);

            if (!expiredBookings.Any())
                return;

            foreach (var booking in expiredBookings)
            {
                booking.Status = "Cancelled";
            }

            await context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "[BookingExpiryService] {Count} expired booking(s) cancelled at {Time} (UTC).",
                expiredBookings.Count,
                now.ToString("yyyy-MM-dd HH:mm:ss")
            );
        }
    }
}
