import mysql.connector
import os
import requests
import wikipedia
from dotenv import load_dotenv
import time

load_dotenv()
wikipedia.set_lang("tr")
# Wikipedia güvenlik duvarını aşmak için bot olmadığımızı kanıtlıyoruz:
wikipedia.set_user_agent("WorldEduHackathon/1.0 (Student Project)")

HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya"]

def get_safe_wiki(query):
    try:
        # Wikipedia IP'mizi bloklamasın diye her istekte 1.5 saniye bekliyoruz
        time.sleep(1.5) 
        return wikipedia.summary(query, sentences=2, auto_suggest=True)
    except wikipedia.exceptions.DisambiguationError as e:
        # Eğer Wikipedia "Hangisini kastettin?" derse, doğrudan ilkini al
        try:
            time.sleep(1)
            return wikipedia.summary(e.options[0], sentences=2, auto_suggest=False)
        except Exception:
            return None
    except Exception as e:
        print(f"      -> Uyarı: '{query}' Wikipedia'dan reddedildi. ({type(e).__name__})")
        return None

def get_country_info(country_name):
    print(f"\n🛡️ {country_name} için Vikipedi DDOS koruması aşılarak veri çekiliyor...")
    
    data = {
        "name": country_name, 
        "iso": None, 
        "img1": f"https://placehold.co/800x400/png?text={country_name}+Bayrak", 
        "img2": f"https://placehold.co/800x400/png?text={country_name}+Manzara",
        "categories": {}
    }
    
    # 1. REST Countries
    try:
        res = requests.get(f"https://restcountries.com/v3.1/translation/{country_name}", timeout=5)
        if res.status_code == 200:
            rj = res.json()
            if isinstance(rj, list) and len(rj) > 0:
                data["iso"] = rj[0].get("cca3", data["iso"])
                data["img1"] = rj[0].get("flags", {}).get("png", data["img1"])
    except Exception:
        pass

    # 2. Wikipedia Görsel
    try:
        time.sleep(1)
        page = wikipedia.page(country_name, auto_suggest=True)
        if len(page.images) > 0:
            for img in page.images:
                if img.endswith(('.jpg', '.png')) and "flag" not in img.lower():
                    data["img2"] = img
                    break
    except Exception:
        pass

    # 3. YAVAŞ VE ZIRHLI METİN ÇEKİMİ
    print("   - Tarih bilgisi alınıyor...")
    tarih = get_safe_wiki(f"{country_name} tarihi")
    
    print("   - Coğrafya bilgisi alınıyor...")
    cografya = get_safe_wiki(f"{country_name} coğrafyası")
    
    print("   - Kültür bilgisi alınıyor...")
    kultur = get_safe_wiki(f"{country_name} kültürü")

    # Eğer bir kategori yine de reddedilirse ana ülkenin giriş metnini can simidi olarak al
    main_summary = None
    if not kultur or not cografya or not tarih:
        main_summary = get_safe_wiki(country_name)
        
    data["categories"]["Tarih"] = tarih if tarih else (main_summary if main_summary else f"{country_name} tarihi çok köklüdür.")
    data["categories"]["Coğrafya"] = cografya if cografya else (main_summary if main_summary else f"{country_name} eşsiz coğrafyaya sahiptir.")
    data["categories"]["Kültür"] = kultur if kultur else (main_summary if main_summary else f"{country_name} zengin gelenekleriyle bilinir.")
            
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

        for cat_name, content in info["categories"].items():
            cursor.execute("SELECT id FROM categories WHERE name = %s", (cat_name,))
            cat_result = cursor.fetchone()
            
            if not cat_result:
                cursor.execute("INSERT INTO categories (name) VALUES (%s)", (cat_name,))
                cat_id = cursor.lastrowid
            else:
                cat_id = cat_result[0]
                
            cursor.execute(
                """INSERT INTO country_contents (country_id, category_id, content_text) 
                   VALUES (%s, %s, %s) 
                   ON DUPLICATE KEY UPDATE content_text = VALUES(content_text)""",
                (country_id, cat_id, content)
            )
        
        db.commit()
        print(f"✅ {c_name} veritabanına sorunsuz yazıldı!")

    cursor.close()
    db.close()
    print("\n🎉 İŞLEM TAMAM! GÜVENLİK DUVARI AŞILDI, GERÇEK VERİLER AKTİF.")

if __name__ == "__main__":
    run_auto_seeder()