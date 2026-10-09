import mysql.connector
import os
import requests
import wikipedia
from dotenv import load_dotenv
import time

load_dotenv()
wikipedia.set_lang("tr")
HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya"]

def get_wiki_summary(query):
    try:
        # 1. Önce Wikipedia'da arama yap (Örn: "İtalya kültürü" -> "İtalyan kültürü" sonucunu bulur)
        results = wikipedia.search(query)
        if results:
            # 2. Bulunan ilk ve en doğru sayfanın özetini çek
            return wikipedia.summary(results[0], sentences=2, auto_suggest=False)
    except Exception:
        pass
    return None

def get_country_info(country_name):
    print(f"\n🌍 {country_name} için akıllı arama yapılıyor...")
    
    data = {
        "name": country_name, 
        "iso": None, 
        "img1": f"https://placehold.co/800x400/png?text={country_name}+Bayrak", 
        "img2": f"https://placehold.co/800x400/png?text={country_name}+Manzara",
        "categories": {
            "Tarih": f"{country_name} tarihi çok köklüdür.",
            "Coğrafya": f"{country_name} çeşitli yeryüzü şekillerine sahiptir.",
            "Kültür": f"{country_name} kültürü zengin gelenekleriyle bilinir."
        }
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
        page = wikipedia.page(country_name, auto_suggest=True)
        if len(page.images) > 0:
            for img in page.images:
                if img.endswith(('.jpg', '.png')) and "flag" not in img.lower():
                    data["img2"] = img
                    break
    except Exception:
        pass

    # 3. YENİ: Akıllı Arama ile Metin Çekme
    tarih_text = get_wiki_summary(f"{country_name} tarihi")
    if tarih_text: data["categories"]["Tarih"] = tarih_text
        
    cografya_text = get_wiki_summary(f"{country_name} coğrafyası")
    if cografya_text: data["categories"]["Coğrafya"] = cografya_text
        
    kultur_text = get_wiki_summary(f"{country_name} kültürü")
    if kultur_text: data["categories"]["Kültür"] = kultur_text
            
    return data

def get_country_info(country_name):
    print(f"\n🌍 {country_name} için veriler toplanıyor...")
    
    data = {
        "name": country_name, 
        "iso": None, 
        "img1": f"https://placehold.co/800x400/png?text={country_name}+Bayrak", 
        "img2": f"https://placehold.co/800x400/png?text={country_name}+Manzara",
        "categories": {
            "Tarih": f"{country_name} tarihi çok köklüdür ve dünya medeniyetine büyük katkıları olmuştur.",
            "Coğrafya": f"{country_name} stratejik bir konuma ve çeşitli yeryüzü şekillerine sahiptir.",
            "Kültür": f"{country_name} kültürü zengin gelenekleri ve mutfağıyla bilinir."
        }
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
        page = wikipedia.page(country_name, auto_suggest=True)
        if len(page.images) > 0:
            for img in page.images:
                if img.endswith(('.jpg', '.png')) and "flag" not in img.lower():
                    data["img2"] = img
                    break
    except Exception:
        pass

    # 3. Wikipedia Metinleri (HER BİRİ BAĞIMSIZ)
    
    # Tarih
    try:
        data["categories"]["Tarih"] = wikipedia.summary(f"{country_name} tarihi", sentences=2, auto_suggest=True)
    except Exception:
        pass
        
    # Coğrafya
    try:
        data["categories"]["Coğrafya"] = wikipedia.summary(f"{country_name} coğrafyası", sentences=2, auto_suggest=True)
    except Exception:
        pass
        
    # Kültür
    try:
        data["categories"]["Kültür"] = wikipedia.summary(f"{country_name} kültürü", sentences=2, auto_suggest=True)
    except Exception:
        try:
            # Sayfa yoksa, ana ülke sayfasının özetinden son cümleleri al
            summary = wikipedia.summary(country_name, sentences=4)
            sentences = summary.split('. ')
            if len(sentences) >= 4:
                data["categories"]["Kültür"] = '. '.join(sentences[-2:]) + '.'
            else:
                data["categories"]["Kültür"] = summary
        except Exception:
            pass
            
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
        
        # Ülkeyi Ekle
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

        # İçerikleri Güncelle (Upsert Mekanizması)
        for cat_name, content in info["categories"].items():
            cursor.execute("SELECT id FROM categories WHERE name = %s", (cat_name,))
            cat_result = cursor.fetchone()
            
            if cat_result:
                cat_id = cat_result[0]
                cursor.execute(
                    """INSERT INTO country_contents (country_id, category_id, content_text) 
                       VALUES (%s, %s, %s) 
                       ON DUPLICATE KEY UPDATE content_text = VALUES(content_text)""",
                    (country_id, cat_id, content)
                )
        
        db.commit()
        print(f"✅ {c_name} gerçek verilerle güncellendi!")
        time.sleep(0.5)

    cursor.close()
    db.close()
    print("\n🎉 VERİTABANI BAŞARIYLA EZİLDİ VE GÜNCELLENDİ!")

if __name__ == "__main__":
    run_auto_seeder()