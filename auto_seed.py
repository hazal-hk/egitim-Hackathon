import mysql.connector
import os
import requests
from dotenv import load_dotenv
import time
import sys

load_dotenv()
HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya", "Amerika Birleşik Devletleri", "Afganistan", "Almanya", "Andorra", "Angola", "Antigua ve Barbuda", "Arjantin", "Arnavutluk", "Avustralya", "Avusturya", "Azerbaycan", "Bahamalar", "Bahreyn", "Bangladeş", "Barbados", "Belarus", "Belçika", "Belize", "Benin", "Birleşik Arap Emirlikleri", "Birleşik Krallık", "Bolivya", "Bosna-Hersek", "Botsvana", "Brunei", "Bulgaristan", "Burkina Faso", "Burundi", "Cabo Verde", "Cezayir", "Cibuti", "Çad", "Çekya", "Çin", "Danimarka", "Doğu Timor", "Dominik Cumhuriyeti", "Dominika", "Ekvador", "Ekvator Ginesi", "El Salvador", "Endonezya", "Eritre", "Ermenistan", "Estonya", "Eswatini", "Etiyopya", "Fas", "Fiji", "Fildişi Sahili", "Filipinler", "Filistin", "Finlandiya", "Fransa", "Gabon", "Gambiya", "Gana", "Gine", "Gine-Bissau", "Grenada", "Guatemala", "Guyana", "Güney Afrika", "Güney Kore", "Güney Sudan", "Gürcistan", "Haiti", "Hırvatistan", "Hindistan", "Hollanda", "Honduras", "Irak", "İran", "İrlanda", "İspanya", "İsrail", "İsveç", "İsviçre", "İzlanda", "Jamaika", "Kamboçya", "Kamerun", "Kanada", "Karadağ", "Katar", "Kazakistan", "Kenya", "Kırgızistan", "Kiribati", "Kolombiya", "Komorlar", "Kongo Cumhuriyeti", "Kongo Demokratik Cumhuriyeti", "Kosta Rika", "Kuveyt", "Kuzey Kore", "Kuzey Makedonya", "Küba", "Kıbrıs Cumhuriyeti", "Laos", "Lesotho", "Letonya", "Liberya", "Libya", "Lihtenştayn", "Litvanya", "Lübnan", "Lüksemburg", "Macaristan", "Madagaskar", "Malavi", "Maldivler", "Malezya", "Mali", "Malta", "Marshall Adaları", "Mauritius", "Meksika", "Mikronezya", "Moldova", "Monako", "Moğolistan", "Moritanya", "Mozambik", "Myanmar", "Namibya", "Nauru", "Nepal", "Nijer", "Nijerya", "Nikaragua", "Norveç", "Özbekistan", "Pakistan", "Palau", "Panama", "Papua Yeni Gine", "Paraguay", "Peru", "Polonya", "Portekiz", "Romanya", "Ruanda", "Rusya", "Saint Kitts ve Nevis", "Saint Lucia", "Saint Vincent ve Grenadinler", "Samoa", "San Marino", "São Tomé ve Príncipe", "Senegal", "Sırbistan", "Seyşeller", "Sierra Leone", "Singapur", "Slovakya", "Slovenya", "Solomon Adaları", "Somali", "Sri Lanka", "Sudan", "Surinam", "Suriye", "Suudi Arabistan", "Şili", "Tacikistan", "Tanzanya", "Tayland", "Togo", "Tonga", "Trinidad ve Tobago", "Tunus", "Tuvalu", "Türkmenistan", "Uganda", "Ukrayna", "Umman", "Uruguay", "Vatikan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Yeni Zelanda", "Yunanistan", "Zambiya", "Zimbabve"]

def get_safe_wiki(query, get_image=False):
    # Wikimedia kuralları gereği robot olmadığımızı ve öğrenci projesi olduğumuzu mail ile kanıtlıyoruz
    headers = {"User-Agent": "WorldEduHackathonBot/1.0 (448887@ogr.ktu.edu.tr)"}
    
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
    print(f"\n🚀 {country_name} için Wikipedia API'sine bağlanılıyor...")

    data = {
        "name": country_name,
        "iso": None,
        "img1": f"https://placehold.co/800x400/png?text={country_name}+Bayrak",
        "img2": f"https://placehold.co/800x400/png?text={country_name}+Manzara",
    }

    # 1. REST Countries (bayrak + ISO)
    try:
        res = requests.get(
            f"https://restcountries.com/v3.1/translation/{country_name}", timeout=5
        )
        if res.status_code == 200:
            rj = res.json()
            if isinstance(rj, list) and rj:
                match = next(
                    (c for c in rj
                     if c.get("translations", {}).get("tur", {}).get("common") == country_name),
                    rj[0],
                )
                data["iso"] = match.get("cca3")
                data["img1"] = match.get("flags", {}).get("png", data["img1"])
    except Exception:
        pass

    # 2. Wikipedia görsel
    wiki_img = get_safe_wiki(country_name, get_image=True)
    if wiki_img:
        data["img2"] = wiki_img

    # 3. Metinler
    print("   - Coğrafya...")
    cografya = get_safe_wiki(f"{country_name} coğrafyası")
    dag = get_safe_wiki(f"{country_name} dağları")
    nehir = get_safe_wiki(f"{country_name} nehirleri")
    fiziki = " ".join(p for p in (dag, nehir) if p)

    print("   - Kültür...")
    kultur = get_safe_wiki(f"{country_name} kültürü")
    yemekler = get_safe_wiki(f"{country_name} mutfağı")

    print("   - Tarih...")
    tarih = get_safe_wiki(f"{country_name} tarihi")

    print("   - Ekonomi...")
    ekonomi = get_safe_wiki(f"{country_name} ekonomisi")
    tarim = get_safe_wiki(f"{country_name} tarımı")
    sanayi = get_safe_wiki(f"{country_name} sanayisi")
    sektorler = " ".join(p for p in (tarim, sanayi) if p)

    main_summary = None
    if not all((cografya, fiziki, kultur, yemekler, tarih, ekonomi, sektorler)):
        main_summary = get_safe_wiki(country_name)

    data["tree"] = {
        "Coğrafya": {
            "Genel Coğrafya": cografya or main_summary or f"{country_name} eşsiz bir coğrafyaya sahiptir.",
            "Fiziki Coğrafya": fiziki or f"{country_name} dağlar ve nehirler barındırır.",
        },
        "Kültür": {
            "Gelenekler": kultur or main_summary or f"{country_name} zengin gelenekleriyle bilinir.",
            "Yemekler": yemekler or f"{country_name} mutfağı ünlüdür.",
        },
        "Tarih": {
            "Genel Tarih": tarih or main_summary or f"{country_name} köklü bir tarihe sahiptir.",
        },
        "Ekonomi": {
            "Genel Ekonomi": ekonomi or main_summary or f"{country_name} çeşitli sektörlere dayanan bir ekonomiye sahiptir.",
            "Tarım ve Sanayi": sektorler or f"{country_name} ekonomisinde tarım ve sanayi önemli yer tutar.",
        },
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
    if len(sys.argv) > 1:
        HACKATHON_COUNTRIES[:] = sys.argv[1:]
    run_auto_seeder()