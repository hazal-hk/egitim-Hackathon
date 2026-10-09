using Hackaton.Models;

namespace Hackaton.Service
{
    public interface ICountryContentService
    {
        Task<CountryContentModel> GetContentByCountryAndCategoryAsync(string countryId, string categoryId);

        // Bir ülkeye ait yazılmış tüm kategori içeriklerini toplu halde listeler
        Task<IEnumerable<CountryContentModel>> GetAllContentsByCountryIdAsync(string countryId);
    }
}
