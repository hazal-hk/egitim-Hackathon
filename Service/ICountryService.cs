using Hackaton.Models;

namespace Hackaton.Service
    
{
    public interface ICountryService
    {
        Task<CountryModel> GetCountryByIdAsync(string Id);
    }
}
