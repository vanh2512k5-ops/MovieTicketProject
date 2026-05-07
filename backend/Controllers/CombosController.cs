using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    }
}