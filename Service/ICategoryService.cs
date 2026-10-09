using Hackaton.Models;

namespace Hackaton.Service
{
    public interface ICategoryService
    {
        Task<IEnumerable<CategoryModel>> GetAllCategoriesAsync();
        Task<IEnumerable<CategoryModel>> GetSubCategoriesAsync(string parentId);
        Task<IEnumerable<CategoryModel>> GetCategoriesByCountryIdAsync(string countryId);
    }
}
