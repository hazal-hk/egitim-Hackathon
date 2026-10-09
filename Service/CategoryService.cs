using Dapper;
using Hackaton.Models;
using MySqlConnector;
using System.Data;

namespace Hackaton.Service
{
    public class CategoryService:ICategoryService
    {
        private readonly string _connectionString;
        public CategoryService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }
        public async Task<IEnumerable<CategoryModel>> GetAllCategoriesAsync()
        {
            using IDbConnection db = new MySqlConnection(_connectionString);
            string sql = "SELECT id AS Id, name AS Name, parent_id AS ParentId FROM categories";
            return await db.QueryAsync<CategoryModel>(sql);
        }

        public async Task<IEnumerable<CategoryModel>> GetSubCategoriesAsync(string parentId)
        {
            using IDbConnection db = new MySqlConnection(_connectionString);
            string sql = "SELECT id AS Id, name AS Name, parent_id AS ParentId FROM categories WHERE parent_id = @ParentId";
            return await db.QueryAsync<CategoryModel>(sql, new { ParentId = parentId });
        }
        public async Task<IEnumerable<CategoryModel>> GetCategoriesByCountryIdAsync(string countryId)
        {
            using IDbConnection db = new MySqlConnection(_connectionString);
            string sql = @"
                DISTINCT c.id AS Id, c.name AS Name, c.parent_id AS ParentId 
                FROM categories c
                JOIN country_contents cc ON c.id = cc.category_id
                WHERE cc.country_id = @CountryId";

            // Not: DISTINCT anahtar kelimesi ile mükerrer kategori kayıtlarını önlüyoruz
            string distinctSql = @"
                SELECT DISTINCT cat.id AS Id, cat.name AS Name, cat.parent_id AS ParentId
                FROM categories cat
                INNER JOIN country_contents cc ON cat.id = cc.category_id
                WHERE cc.country_id = @CountryId";

            return await db.QueryAsync<CategoryModel>(distinctSql, new { CountryId = countryId });
        }
    }
}
