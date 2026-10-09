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

            // 1. ADIM: Sadece country_contents tablosundan o ülkeye ait kategori ID'lerini çekiyoruz (JOIN kullanmadan)
            string getIdsSql = "SELECT DISTINCT category_id FROM country_contents WHERE country_id = @CountryId";
            var categoryIds = await db.QueryAsync<string>(getIdsSql, new { CountryId = countryId });

            // Eğer o ülkenin hiçbir içeriği yoksa, patlamaması için boş bir liste dönüyoruz
            if (categoryIds == null || !categoryIds.Any())
            {
                return new List<CategoryModel>();
            }

            // 2. ADIM: İlk sorgudan bulduğumuz Kategori ID'lerini kullanarak 'categories' tablosundan bu kategorilerin isimlerini çekiyoruz
            string getCategoriesSql = @"
            SELECT 
            id AS Id, 
            name AS Name, 
            parent_id AS ParentId 
            FROM categories 
             WHERE id IN @CategoryIds";

            var categories = await db.QueryAsync<CategoryModel>(getCategoriesSql, new { CategoryIds = categoryIds });

            return categories;
        }
    }
}
