import mysql.connector
import os
import requests
from dotenv import load_dotenv
import time

load_dotenv()
HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya"]

def get_safe_wiki(query, get_image=False):
    # Wikimedia kuralları gereği robot olmadığımızı ve öğrenci projesi olduğumuzu mail ile kanıtlıyoruz
    headers = {"User-Agent": "WorldEduHackathonBot/1.0 (hazal.karayigit@ktu.edu.tr)"}
    
    # GÜVENLİK DUVARI İÇİN KRİTİK NOKTA: Her istekten önce 1.5 saniye nefes al!
    time.sleep(1.5)
    
    try:
        # URL hatalarını (boşluk, Türkçe karakter) önlemek için requests'in params özelliğini kullanıyoruz
        search_url = "https://tr.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "utf8": "",
            "format": "json"
        }
        search_res = requests.get(search_url, params=search_params, headers=headers, timeout=5)
        
        if search_res.status_code == 200:
            search_data = search_res.json()
            if search_data.get("query", {}).get("search"):
                # En doğru sayfa başlığını bulduk
                best_title = search_data["query"]["search"][0]["title"]
                
                # Sayfa içeriğini çekmeden önce tekrar 1.5 saniye dinleniyoruz
                time.sleep(1.5)
                
                # Boşlukları alt tireye çevirip REST API'ye yolluyoruz
                summary_url = f"https://tr.wikipedia.org/api/rest_v1/page/summary/{best_title.replace(' ', '_')}"
                summary_res = requests.get(summary_url, headers=headers, timeout=5)
                
                if summary_res.status_code == 200:
                    summary_data = summary_res.json()
                    
                    if get_image:
                        return summary_data.get("thumbnail", {}).get("source")
                        
                    extract = summary_data.get("extract", "")
                    if extract:
                        sentences = extract.split(". ")
                        return ". ".join(sentences[:2]) + "."
    except Exception as e:
        print(f"      -> Uyarı: '{query}' API bağlantısında hata: {e}")
        
    return None

def get_country_info(country_name):
    print(f"\n🚀 {country_name} için Resmi Wikipedia API'sine yavaş ve güvenli bağlanılıyor...")
    
    data = {
        "name": country_name, 
        "iso": None, 
        "img1": f"https://placehold.co/800x400/png?text={country_name}+Bayrak", 
        "img2": f"https://placehold.co/800x400/png?text={country_name}+Manzara",
        "categories": {}
    }
    
    # 1. REST Countries (Bayrak ve ISO)
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
    wiki_img = get_safe_wiki(country_name, get_image=True)
    if wiki_img:
        data["img2"] = wiki_img


    # 3. YENİ KUSURSUZ VE ZENGİN METİN ÇEKİMİ
    print("   - Tarih bilgisi alınıyor...")
    tarih = get_safe_wiki(f"{country_name} tarihi")
    
    print("   - Fiziki Coğrafya bilgisi alınıyor (Dağlar, Göller, Nehirler)...")
    fiziki_cografya_1 = get_safe_wiki(f"{country_name} dağları")
    fiziki_cografya_2 = get_safe_wiki(f"{country_name} nehirleri")
    
    fiziki = ""
    if fiziki_cografya_1:
        fiziki += fiziki_cografya_1 + " "
    if fiziki_cografya_2:
        fiziki += fiziki_cografya_2
        
    print("   - Kültür bilgisi alınıyor...")
    kultur = get_safe_wiki(f"{country_name} kültürü")

    print("   - Yemek kültürü bilgisi alınıyor...")
    yemekler = get_safe_wiki(f"{country_name} mutfağı")

    main_summary = None
    if not kultur or not tarih or not fiziki or not yemekler:
        main_summary = get_safe_wiki(country_name)
        
    # Verileri SADECE İSTEDİĞİMİZ 4 KATEGORİYE YAZIYORUZ
    data["categories"]["Tarih"] = tarih if tarih else (main_summary if main_summary else f"{country_name} köklü bir tarihe sahiptir.")
    
    data["categories"]["Fiziki Coğrafya"] = fiziki.strip() if fiziki.strip() else f"{country_name} çeşitli dağ sıraları, nehirler ve göllerden oluşan zengin bir fiziki yapıya sahiptir."
    
    data["categories"]["Kültür"] = kultur if kultur else (main_summary if main_summary else f"{country_name} zengin gelenekleriyle bilinir.")

    data["categories"]["Yemekler"] = yemekler if yemekler else f"{country_name} mutfağı bölgesel lezzetleriyle ünlüdür."
            
    return data

    # 4. KUSURSUZ AĞAÇ (TREE) YAPISI
    # Artık verileri düz değil, dallanıp budaklanacak şekilde paketliyoruz
    data["tree"] = {
        "Coğrafya": {
            "Genel": cografya if cografya else f"{country_name} eşsiz bir coğrafyaya sahiptir.",
            "Fiziki (Dağlar ve Nehirler)": fiziki.strip() if fiziki.strip() else f"{country_name} dağlar ve göllerden oluşan zengin bir fiziki yapıya sahiptir."
        },
        "Kültür": {
            "Genel Gelenekler": kultur if kultur else f"{country_name} zengin gelenekleriyle bilinir.",
            "Yemekler (Mutfak)": yemekler if yemekler else f"{country_name} mutfağı çok lezzetlidir."
        },
        "Tarih": {
            "Kısa Tarihçe": tarih if tarih else f"{country_name} köklü bir tarihe sahiptir."
        }
    }
            
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
        
        # 1. Ülkeyi Ekle/Bul
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

        # 2. AĞAÇ MİMARİSİNİ VERİTABANINA İŞLEME
        for main_cat_name, sub_categories in info["tree"].items():
            
            # 2A. Ana Kategoriyi Bul veya Yarat (parent_id = NULL olanlar)
            cursor.execute("SELECT id FROM categories WHERE name = %s AND parent_id IS NULL", (main_cat_name,))
            main_cat_result = cursor.fetchone()
            
            if not main_cat_result:
                cursor.execute("INSERT INTO categories (name, parent_id) VALUES (%s, NULL)", (main_cat_name,))
                main_cat_id = cursor.lastrowid
            else:
                main_cat_id = main_cat_result[0]
                
            # 2B. Alt Kategorileri Ana Kategoriye Bağla ve İçeriği Ekle
            for sub_cat_name, content in sub_categories.items():
                cursor.execute("SELECT id FROM categories WHERE name = %s AND parent_id = %s", (sub_cat_name, main_cat_id))
                sub_cat_result = cursor.fetchone()
                
                if not sub_cat_result:
                    cursor.execute("INSERT INTO categories (name, parent_id) VALUES (%s, %s)", (sub_cat_name, main_cat_id))
                    sub_cat_id = cursor.lastrowid
                else:
                    sub_cat_id = sub_cat_result[0]
                    
                # 2C. İçeriği tam olarak Alt Kategorinin içine yaz!
                cursor.execute(
                    """INSERT INTO country_contents (country_id, category_id, content_text) 
                       VALUES (%s, %s, %s) 
                       ON DUPLICATE KEY UPDATE content_text = VALUES(content_text)""",
                    (country_id, sub_cat_id, content)
                )
        
        db.commit()
        print(f"✅ {c_name} hiyerarşik (ağaç) mimariyle veritabanına yazıldı!")

    cursor.close()
    db.close()
    print("\n🎉 İŞLEM TAMAM! 3 BOYUTLU VERİTABANI MİMARİSİ AKTİF.")

if __name__ == "__main__":
    run_auto_seeder()