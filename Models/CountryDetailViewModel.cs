namespace Hackaton.Models
{
    public class CountryDetailViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string IsoCode { get; set; }
        public string Image1Url { get; set; }
        public string Image2Url { get; set; }
        public List<CountryContentModel> Contents { get; set; }
    }

    public class CategoryContentDto 
    {
     public string CategoryName { get; set; }
     public string ContentText { get; set; }    
    }
}
