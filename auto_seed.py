import mysql.connector
import os
import requests
import wikipedia
from dotenv import load_dotenv
import time

load_dotenv()

# Wikipedia'yı Türkçe içerik çekecek şekilde ayarlıyoruz
wikipedia.set_lang("tr")

# Hackathon MVP'si (İlk Gösterim) için seçtiğimiz vurucu ülkeler
# İstersen buraya 50 ülke yaz, gerisini kod halletsin.
HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya"]

def get_country_info(country_name):
    print(f"🌍 {country_name} için veriler çekiliyor...")
    data = {"name": country_name, "iso": "", "img1": "", "img2": ""}
    
    try:
        # 1. REST Countries'den ISO Kodu ve Bayrak alma
        res = requests.get(f"https://restcountries.com/v3.1/translation/{country_name}")
        if res.status_code == 200:
            country_data = res.json()[0]
            data["iso"] = country_data.get("cca3", "Bilinmiyor")
            data["img1"] = country_data.get("flags", {}).get("png", "")
            
        # 2. Wikipedia'dan görsel ve metin çekme
        page = wikipedia.page(country_name)
        
        # Wikipedia sayfasındaki ilk uygun fotoğrafı 2. görsel yap
        if len(page.images) > 0:
            for img in page.images:
                if img.endswith(('.jpg', '.png')) and "flag" not in img.lower():
                    data["img2"] = img
                    break
                    
        # 3. Kategoriler için Wikipedia'dan hap bilgiler çekme (2'şer cümle)
        data["categories"] = {
            "Tarih": wikipedia.summary(f"{country_name} tarihi", sentences=2),
            "Coğrafya": wikipedia.summary(f"{country_name} coğrafyası", sentences=2),
            "Kültür": wikipedia.summary(f"{country_name} kültürü", sentences=2)
        }
    except Exception as e:
        print(f"  Hata ({country_name}): {e}")
        return None
        
    return data

def run_auto_seeder():
    db = mysql.connector.connect(
        host=os.getenv("DB_HOST"), port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    cursor = db.cursor()

    for c_name in HACKATHON_COUNTRIES:
        info = get_country_info(c_name)
        if not info:
            continue
            
        # Ülkeyi veritabanına ekle
        cursor.execute("SELECT id FROM countries WHERE name = %s", (info["name"],))
        result = cursor.fetchone()
        
        if not result:
            cursor.execute(
                "INSERT INTO countries (name, iso_code, image_1_url, image_2_url) VALUES (%s, %s, %s, %s)",
                (info["name"], info["iso"], info["img1"], info["img2"])
            )
            country_id = cursor.lastrowid
        else:
            country_id = result[0]

        # İçerikleri Kategorilere Ekle
        for cat_name, content in info["categories"].items():
            cursor.execute("SELECT id FROM categories WHERE name = %s", (cat_name,))
            cat_result = cursor.fetchone()
            
            if cat_result:
                cat_id = cat_result[0]
                cursor.execute(
                    "INSERT IGNORE INTO country_contents (country_id, category_id, content_text) VALUES (%s, %s, %s)",
                    (country_id, cat_id, content)
                )
        
        db.commit()
        print(f"✅ {c_name} veritabanına başarıyla işlendi!\n")
        time.sleep(1) # Wikipedia'yı çok hızlı istek atıp engellenmemek için 1 saniye bekle

    cursor.close()
    db.close()
    print("TAHIL AMBARI DOLDU! Bütün ülkeler veritabanında.")

if __name__ == "__main__":
    run_auto_seeder()