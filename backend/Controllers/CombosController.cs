using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using MovieTicketAPI.Models;

namespace MovieTicketAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CombosController : ControllerBase
    {
        private readonly MovieTicketContext _context;

        public CombosController(MovieTicketContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCombos()
        {
            var combos = await _context.Combos.ToListAsync();
            return Ok(combos);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateCombo([FromBody] Combo combo)
        {
            _context.Combos.Add(combo);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCombos), new { id = combo.Id }, combo);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCombo(int id, [FromBody] Combo updatedCombo)
        {
            if (id != updatedCombo.Id) return BadRequest("ID không khớp");

            var combo = await _context.Combos.FindAsync(id);
            if (combo == null) return NotFound("Không tìm thấy combo!");

            combo.Name = updatedCombo.Name;
            combo.Description = updatedCombo.Description;
            combo.Price = updatedCombo.Price;
            combo.ImageUrl = updatedCombo.ImageUrl;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Cập nhật combo thành công!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCombo(int id)
        {
            var combo = await _context.Combos.FindAsync(id);
            if (combo == null) return NotFound("Không tìm thấy combo!");

            var hasBookings = await _context.BookingCombos.AnyAsync(bc => bc.ComboId == id);
            if (hasBookings) return BadRequest("Không thể xóa combo đã có khách đặt mua!");

            _context.Combos.Remove(combo);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Đã xóa combo thành công!" });
        }
    }
}