using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Tạm thời comment Authorize để Admin có thể test dễ dàng, hoặc bật lên nếu dự án bắt buộc
    // [Authorize(Roles = "Admin")] 
    public class PricingRulesController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public PricingRulesController(MovieTicketContext context)
        {
            _context = context;
        }

        // GET: api/PricingRules
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PricingRule>>> GetPricingRules()
        {
            return await _context.PricingRules.ToListAsync();
        }

        // GET: api/PricingRules/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PricingRule>> GetPricingRule(int id)
        {
            var pricingRule = await _context.PricingRules.FindAsync(id);

            if (pricingRule == null)
            {
                return NotFound(new { Message = "Không tìm thấy quy tắc cấu hình giá." });
            }

            return pricingRule;
        }

        // PUT: api/PricingRules/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPricingRule(int id, PricingRule pricingRule)
        {
            if (id != pricingRule.Id)
            {
                return BadRequest(new { Message = "ID không khớp." });
            }

            _context.Entry(pricingRule).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PricingRuleExists(id))
                {
                    return NotFound(new { Message = "Không tìm thấy quy tắc cấu hình giá." });
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/PricingRules
        [HttpPost]
        public async Task<ActionResult<PricingRule>> PostPricingRule(PricingRule pricingRule)
        {
            _context.PricingRules.Add(pricingRule);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetPricingRule", new { id = pricingRule.Id }, pricingRule);
        }

        // DELETE: api/PricingRules/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePricingRule(int id)
        {
            var pricingRule = await _context.PricingRules.FindAsync(id);
            if (pricingRule == null)
            {
                return NotFound(new { Message = "Không tìm thấy quy tắc cấu hình giá." });
            }

            _context.PricingRules.Remove(pricingRule);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PricingRuleExists(int id)
        {
            return _context.PricingRules.Any(e => e.Id == id);
        }
    }
}
