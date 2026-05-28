using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MovieTicketAPI.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Cho phép Request đi tiếp
                await _next(context);
            }
            catch (Exception ex)
            {
                // Bắt toàn bộ lỗi phát sinh
                _logger.LogError(ex, "Lỗi hệ thống không mong muốn: {Message}", ex.Message);
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var response = new
            {
                Message = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!",
                Error = exception.Message // Có thể ẩn đi trên môi trường Production
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
