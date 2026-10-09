using Hackaton.Service;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddScoped<Hackaton.Service.ICountryService, Hackaton.Service.CountryService>();
builder.Services.AddScoped<Hackaton.Service.ICategoryService, Hackaton.Service.CategoryService>();
builder.Services.AddScoped<ICountryContentService, CountryContentService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseDefaultFiles(); // index.html'i varsayýlan sayfa yapar
app.UseStaticFiles();  // css ve js dosyalarýnýn okunmasýna izin verir

app.UseAuthorization();

app.MapControllers();

app.Run();