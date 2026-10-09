# fill_iso.py
import gettext
import pycountry
import mysql.connector
import os

db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "world_edu_db"),
    charset="utf8mb4",
)

def norm(s):
    return s.replace("İ", "i").replace("I", "ı").lower().strip()

tr = gettext.translation("iso3166-1", pycountry.LOCALES_DIR, languages=["tr"], fallback=True)

lookup = {}
for c in pycountry.countries:
    names = {c.name, getattr(c, "official_name", None),
             getattr(c, "common_name", None), tr.gettext(c.name)}
    for n in names:
        if n:
            lookup.setdefault(norm(n), c.alpha_3)

cur = db.cursor()
cur.execute("SELECT id, name FROM countries WHERE iso_code IS NULL")

ok, missing = 0, []
for cid, name in cur.fetchall():
    iso = lookup.get(norm(name))
    if not iso:
        missing.append(name)
        continue
    try:
        cur.execute("UPDATE countries SET iso_code=%s WHERE id=%s", (iso, cid))
        ok += 1
    except mysql.connector.Error as e:
        missing.append(f"{name} ({e.msg})")

db.commit()
print(f"{ok} güncellendi, {len(missing)} eşleşmedi")
for m in missing:
    print("  -", m)