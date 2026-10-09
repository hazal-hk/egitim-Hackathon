using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Hackaton.Service;

namespace Hackaton.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService _categoryService;
        public CategoryController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        // Uygulamadaki tüm kategorileri listeler.
        [HttpGet]
        public async Task<IActionResult> GetAllCategories()
        {
            var categories = await _categoryService.GetAllCategoriesAsync();
            return Ok(categories);
        }
        // Örn: /api/category/parent/8 -> Coğrafya kategorisinin altındaki başlıkları (Fiziki Coğrafya vb.) getirir.
        [HttpGet("parent/{parentId}")]
        public async Task<IActionResult> GetSubCategories(int parentId)
        {
            var subCategories = await _categoryService.GetSubCategoriesAsync(parentId);
            return Ok(subCategories);
        }

        // Örn: /api/category/country/1 -> Türkiye'ye (ID: 1) tıklandığında, Türkiye'nin verisi olan kategorileri getirir.
        [HttpGet("country/{countryId}")]
        public async Task<IActionResult> GetCategoriesByCountry(int countryId)
        {
            var categories = await _categoryService.GetCategoriesByCountryIdAsync(countryId);

            if (categories == null || !categories.Any())
            {
                return NotFound(new { message = "Bu ülkeye ait kategori içeriği bulunamadı." });
            }

            return Ok(categories);
        }

    }
}
