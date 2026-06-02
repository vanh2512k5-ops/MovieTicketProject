using System.Collections.Generic;

namespace MovieTicketAPI.DTOs
{
    public class ComboRequest
    {
        public int ComboId { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateBookingRequest
    {
        public int ShowtimeId { get; set; }
        public List<int> SeatIds { get; set; } = new List<int>();
        public List<ComboRequest> Combos { get; set; } = new List<ComboRequest>();
    }

    public class PaymentCallbackRequest
    {
        public string MerchantId { get; set; } = "";
        public string OrderId    { get; set; } = "";
        public string BillId     { get; set; } = "";
        public int Amount        { get; set; }
        public string Status     { get; set; } = "";
        public string Timestamp  { get; set; } = "";
    }
}
