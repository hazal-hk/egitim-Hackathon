using Dapper;
using Hackaton.Models;
using MySqlConnector;
using System.Data;

namespace Hackaton.Service
{
    public class CountryContentService : ICountryContentService
    {
        private readonly string _connectionString;
        public CountryContentService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        public async Task<CountryContentModel> GetContentByCountryAndCategoryAsync(string countryId, string categoryId)
        {
            using (var connection = new MySqlConnection(_connectionString))
            {
                var query = "SELECT id AS Id, country_id AS CountryId, category_id AS CategoryId, content_text AS ContentText FROM country_contents WHERE country_id = @CountryId AND category_id = @CategoryId"; ;
                return await connection.QueryFirstOrDefaultAsync<CountryContentModel>(query, new { CountryId = countryId, CategoryId = categoryId });
            }
        }

        public async Task<IEnumerable<CountryContentModel>> GetAllContentsByCountryIdAsync(string countryId)
        {
            using (var connection = new MySqlConnection(_connectionString))
            {
                var query = "SELECT * FROM CountryContents WHERE CountryId = @CountryId";
                return await connection.QueryAsync<CountryContentModel>(query, new { CountryId = countryId });
            }
        }
    }
}
