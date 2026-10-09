using Dapper;
using Hackaton.Models;
using Microsoft.AspNetCore.Razor.TagHelpers;
using MySqlConnector;
using System.Data;

namespace Hackaton.Service
{
    public class CountryService : ICountryService
    {
        private readonly string _connectionString;

        public CountryService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        public async Task<CountryModel> GetCountryByIdAsync(string id)
        {
          using IDbConnection db =  new MySqlConnection(_connectionString);
            string sql = @"
                SELECT 
                    id AS Id, 
                    name AS Name, 
                    iso_code AS IsoCode, 
                    image_1_url AS Image1Url, 
                    image_2_url AS Image2Url
                FROM countries 
                WHERE id = @Id";
            return await db.QueryFirstOrDefaultAsync<CountryModel>(sql, new { Id = id });
        }
    }
}
