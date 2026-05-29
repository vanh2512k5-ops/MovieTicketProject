namespace MovieTicketAPI.Models
{
    public class PricingRule
    {
        public int Id { get; set; }
        
        /// <summary>
        /// Loại phụ thu. Ví dụ: "SeatType", "Format", "Date"
        /// </summary>
        public string RuleType { get; set; } = string.Empty;
        
        /// <summary>
        /// Giá trị tương ứng. Ví dụ: "VIP", "Couple", "3D", "Weekend"
        /// </summary>
        public string RuleKey { get; set; } = string.Empty;
        
        /// <summary>
        /// Số tiền phụ thu (có thể âm nếu giảm giá)
        /// </summary>
        public decimal SurchargeAmount { get; set; }
        
        /// <summary>
        /// Kích hoạt hay không
        /// </summary>
        public bool IsActive { get; set; } = true;
    }
}
