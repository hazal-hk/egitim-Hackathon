using Hackaton.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class CountryContentController : ControllerBase
    {
        private readonly ICountryContentService _contentService;
        public CountryContentController(ICountryContentService contentService)
        {
            _contentService = contentService;
        }

        // Örn: Türkiye (1) ülkesinin Yemekler (13) kategorisindeki içeriği getirir.
        [HttpGet("country/{countryId}/category/{categoryId}")]
        public async Task<IActionResult> GetContentByCountryAndCategory(string countryId, string categoryId)
        {
            var content = await _contentService.GetContentByCountryAndCategoryAsync(countryId, categoryId);
            if (content == null)
            {
                return NotFound(new {message = "Bu ülkenin böyle bir icerigi yok"});
            }
            return Ok(content);
        }

        // Örn: Türkiye'ye ait bütün kategori içeriklerini tek seferde listeler.
        [HttpGet("country/{countryId}")]
        public async Task<IActionResult> GetAllContentsForCountry(string countryId)
        {
            var contents = await _contentService.GetAllContentsByCountryIdAsync(countryId);
            return Ok(contents);
        }
    }
}
