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
            string sql = "SELECT Id, Capital, Name, Description, DidYouKnow FROM Countries WHERE Id = @Id";
            return  await db.QueryFirstOrDefaultAsync<CountryModel>(sql, new { Id = id });
        }
    }
}
