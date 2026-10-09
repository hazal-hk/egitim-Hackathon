import os, sys, time, requests
import mysql.connector
from dotenv import load_dotenv
import pycountry
import json

OVERRIDES = json.load(open("overrides.json", encoding="utf-8")) if os.path.exists("overrides.json") else {}

load_dotenv()

HACKATHON_COUNTRIES = ["Türkiye", "Japonya", "Mısır", "İtalya", "Brezilya"]
SLEEP = 0.3
UA = "WorldEduHackathonBot/1.0 (448887@ogr.ktu.edu.tr)"   # eski User-Agent'ını koy

CATEGORY_TREE = {
    "Tarih": {
        "Genel Tarih": [("{c} tarihi", ("tarih",))],
        "Tarihi Yapılar ve Antik Kentler": [
            ("{c} antik kentleri", ("antik", "kent", "kale")),
            ("{c} tarihi yapıları", ("yapı", "eser", "anıt")),
        ],
    },
    "Coğrafya": {
        "Genel Coğrafya": [("{c} coğrafyası", ("coğrafya",))],
        "Fiziki Coğrafya": [
            ("{c} dağları", ("dağ",)),
            ("{c} nehirleri", ("nehir", "ırmak")),
            ("{c} iklimi", ("iklim",)),
        ],
        "Doğal Harikalar ve Milli Parklar": [
            ("{c} milli parkları", ("park",)),
            ("{c} doğal güzellikleri", ("doğa", "doğal")),
        ],
    },
    "Kültür": {
        "Gelenekler": [("{c} kültürü", ("kültür",))],
        "Mutfak": [("{c} mutfağı", ("mutfa",))],
        "Sanat ve Müzik": [("{c} sanatı", ("sanat",)), ("{c} müziği", ("müzi",))],
    },
    "Ekonomi": {
        "Genel Ekonomi": [("{c} ekonomisi", ("ekonomi",))],
        "Önemli İhracat ve Endüstri": [
            ("{c} ihracatı", ("ihracat",)),
            ("{c} sanayisi", ("sanayi", "endüstri")),
        ],
    },
}
GENERAL = {"Genel Tarih", "Genel Coğrafya", "Genel Ekonomi"}   # özet fallback'i alanlar

def stem(country):
    n = norm(country)
    return n[:max(4, len(n) - 3)]      # Japonya -> japo (Japon), İtalya -> ital (İtalyan)

S = requests.Session()
S.headers["User-Agent"] = UA


def norm(s):
    return s.replace("İ", "i").replace("I", "ı").lower().strip()


def trim_text(text, max_chars=600):
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    end = cut.rfind(". ")
    return cut[:end + 1] if end > 100 else cut.rstrip() + "…"


def wiki(query, country, must=(), used=None, main=False):
    time.sleep(SLEEP)
    try:
        r = S.get("https://tr.wikipedia.org/w/api.php", params={
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": query, "gsrlimit": 5,
            "prop": "extracts|pageimages", "exintro": 1, "explaintext": 1,
            "exsentences": 3, "exlimit": "max",
            "piprop": "thumbnail", "pithumbsize": 800,
        }, timeout=8)
        pages = r.json().get("query", {}).get("pages", {})
    except Exception as e:
        print(f"      -> uyarı: '{query}': {e}")
        return None

    st, full = stem(country), norm(country)
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        title = norm(p.get("title", ""))
        if not p.get("extract"):
            continue
        if main:                                   # sadece ülkenin kendi sayfası
            if title == full:
                return p
            continue
        if st not in title or title == full or "(" in title:
            continue
        if must and not any(k in title for k in must):
            continue
        if used is not None and p["title"] in used:
            continue
        return p
    return None

def flag_url(iso3):
    try:
        a2 = pycountry.countries.get(alpha_3=iso3).alpha_2.lower()
        return f"https://flagcdn.com/w640/{a2}.png"
    except Exception:
        return None


def build_text(country, queries, used):
    parts = []
    st = stem(country)
    for q, must in queries:
        for v in (q.format(c=country), f"{st}* {must[0]}*"):
            p = wiki(v, country, must, used)
            if p:
                used.add(p["title"])
                parts.append(p["extract"].strip().replace("\n", " "))
                break
    return trim_text(" ".join(parts)) if parts else None


def get_cat(cur, name, parent_id):
    if parent_id is None:
        cur.execute("SELECT id FROM categories WHERE name=%s AND parent_id IS NULL", (name,))
    else:
        cur.execute("SELECT id FROM categories WHERE name=%s AND parent_id=%s", (name, parent_id))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO categories (name, parent_id) VALUES (%s, %s)", (name, parent_id))
    return cur.lastrowid


def ensure_categories(cur):
    ids = {}
    for main, subs in CATEGORY_TREE.items():
        main_id = get_cat(cur, main, None)
        for sub in subs:
            ids[(main, sub)] = get_cat(cur, sub, main_id)
    return ids


def seed_country(cur, db, name, cat_ids, force):
    cur.execute("SELECT id, iso_code FROM countries WHERE name=%s", (name,))
    row = cur.fetchone()
    if row and not force:
        cur.execute("SELECT COUNT(*) FROM country_contents WHERE country_id=%s", (row[0],))
        if cur.fetchone()[0] >= len(cat_ids):
            print(f"⏭  {name} zaten tam, atlandı")
            return

    print(f"\n🚀 {name}")
    used = set()
    iso = row[1] if row else None
    flag = flag_url(iso) if iso else None
    main_page = wiki(name, name, main=True)
    img = (main_page or {}).get("thumbnail", {}).get("source")
    summary = trim_text(main_page["extract"].strip()) if main_page else None

    if row:
        country_id = row[0]
        cur.execute(
            """UPDATE countries SET image_1_url=COALESCE(%s, image_1_url),
            image_2_url=COALESCE(%s, image_2_url) WHERE id=%s""",
            (flag, img, country_id))
    else:
        cur.execute(
            "INSERT INTO countries (name, iso_code, image_1_url, image_2_url) VALUES (%s,%s,%s,%s)",
            (name, iso,
             flag or f"https://placehold.co/800x400/png?text={name}+Bayrak",
             img or f"https://placehold.co/800x400/png?text={name}+Manzara"))
        country_id = cur.lastrowid

    for main_name, subs in CATEGORY_TREE.items():
        for sub_name, queries in subs.items():
            print(f"   - {main_name} / {sub_name}")
            text = build_text(name, queries, used)
            if not text and sub_name in GENERAL:
                text = summary
            text = text or "Bu başlık için henüz veri bulunamadı."
            cur.execute(
                """INSERT INTO country_contents (country_id, category_id, content_text)
                   VALUES (%s,%s,%s)
                   ON DUPLICATE KEY UPDATE content_text = VALUES(content_text)""",
                (country_id, cat_ids[(main_name, sub_name)], text))
    db.commit()
    print(f"✅ {name} yazıldı (iso: {iso})")


def main():
    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "world_edu_db"),
        charset="utf8mb4",
    )

    cur = db.cursor(buffered=True)
    cat_ids = ensure_categories(cur)
    db.commit()

    if "--all" in sys.argv:
        cur.execute("SELECT name FROM countries ORDER BY name")
        names = [r[0] for r in cur.fetchall()]
    else:
        names = args or HACKATHON_COUNTRIES

    failed = []
    for i, name in enumerate(names, 1):
        print(f"[{i}/{len(names)}]", end=" ")
        try:
            seed_country(cur, db, name, cat_ids, force)
        except Exception as e:
            db.rollback()
            failed.append(name)
            print(f"❌ {name}: {e}")

    cur.close(); db.close()
    print(f"\nBitti. Başarısız: {failed or 'yok'}")

if __name__ == "__main__":
    main()