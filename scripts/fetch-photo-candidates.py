"""Downloads candidate photos for each recipe from Wikimedia Commons (free licences only)
into a review folder, with licence/author metadata. Pick winners in scripts/photo-picks.json,
then run scripts/build-photos.py.

usage: python3 scripts/fetch-photo-candidates.py OUT_DIR
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

QUERIES = {
    'egg_paratha': 'egg paratha', 'aloo_paratha_cheat': 'aloo paratha', 'egg_muffins': 'egg muffins',
    'overnight_oats': 'overnight oats', 'yogurt_bowl': 'yogurt granola bowl', 'naan_egg_cheese': 'egg naan',
    'french_toast': 'french toast sticks', 'chicken_cheese_wrap': 'chicken wrap', 'tikka_wrap': 'kathi roll',
    'tuna_melt': 'tuna melt sandwich', 'kebab_naan': 'seekh kebab', 'egg_mayo_sandwich': 'egg mayonnaise sandwich',
    'chicken_pizza_naan': 'naan pizza', 'airfryer_chicken_curry': 'chicken karahi', 'tandoori_thighs': 'tandoori chicken',
    'chapli_patties': 'chapli kabab', 'masala_fish': 'fish and chips', 'honey_salmon': 'salmon broccoli',
    'lamb_skewers_rice': 'cumin lamb', 'chickpea_chaat': 'chana chaat', 'tray_bake': 'roast chicken potatoes',
    'paneer_tikka': 'paneer tikka', 'sweet_potato_loaded': 'baked sweet potato', 'shaker_smoothie': 'banana smoothie',
    'protein_milk_dates': 'dates nuts', 'masala_fries': 'masala fries', 'wings': 'chicken wings', 'samosa_plate': 'samosa',
    'apple_pb': 'apple peanut butter', 'choc_banana_oats': 'baked oatmeal', 'avocado_egg_toast': 'avocado toast egg',
    'nugget_wrap': 'chicken nuggets', 'shawarma_bowl': 'shawarma plate', 'aloo_tikki': 'aloo tikki',
    'mango_lassi': 'mango lassi', 'hummus_wrap': 'hummus wrap', 'kofta_tray': 'kofta kebab', 'pb_banana_toast': 'peanut butter banana toast',
    'chicken_seekh': 'chicken seekh kebab', 'chicken_65': 'chicken 65', 'fish_tikka': 'fish tikka',
    'omelette_roll': 'egg roll kolkata', 'palak_paratha': 'palak paratha', 'gobi_roast': 'roasted cauliflower',
    'malai_tikka': 'malai tikka', 'keema_naan': 'keema naan', 'peri_chicken': 'peri peri chicken',
    'shawarma_pita': 'chicken shawarma pita', 'egg_bhurji_toast': 'egg bhurji', 'bombay_potatoes': 'bombay potatoes',
    'fish_tacos': 'fish tacos', 'chicken_satay': 'chicken satay', 'falafel_bites': 'falafel',
    'mango_parfait': 'mango yogurt parfait', 'date_balls': 'energy balls dates', 'caesar_wrap': 'chicken caesar wrap',
    'tuna_kachumber': 'kachumber salad', 'date_shake': 'date milkshake', 'stuffed_peppers': 'stuffed peppers',
    'sweet_potato_fries': 'sweet potato fries', 'mushroom_toastie': 'mushroom cheese toastie', 'green_chutney_chicken': 'hariyali chicken',
    # delivery
    'd_lamian': 'lanzhou beef noodles', 'd_dapanji': 'dapanji', 'd_polo': 'uyghur polo', 'd_samsa': 'samsa uyghur',
    'd_kebab': 'chuan lamb skewers', 'd_laghman': 'laghman', 'd_indian': 'chicken curry naan', 'd_shawarma': 'shawarma',
}
OK_LICENCES = re.compile(r'^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+)', re.I)
UA = 'ReviveApp/1.0 (photo credits build)'

def get(url, tries=5):
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries - 1:
                time.sleep(10 * (attempt + 1)); continue
            raise

def strip(html):
    return re.sub(r'<[^>]+>', '', html or '').strip()

def main(out):
    os.makedirs(out, exist_ok=True)
    meta_path = os.path.join(out, 'candidates.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for rid, q in QUERIES.items():
        if meta.get(rid):
            continue
        time.sleep(9)
        params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': '6',
                  'gsrsearch': f'{q} filetype:bitmap', 'gsrlimit': '12', 'prop': 'imageinfo',
                  'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': '480'}
        try:
            data = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)))
        except Exception as e:
            print(rid, 'search failed', e); continue
        pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
        picks = []
        for p in pages:
            ii = (p.get('imageinfo') or [{}])[0]; m = ii.get('extmetadata', {})
            lic = strip(m.get('LicenseShortName', {}).get('value'))
            if not OK_LICENCES.match(lic or '') or ii.get('mime') not in ('image/jpeg', 'image/png', 'image/webp'):
                continue
            if ii.get('width', 0) < 500:
                continue
            n = len(picks)
            try:
                img = get(ii['thumburl'])
            except Exception:
                continue
            fn = os.path.join(out, f'{rid}__{n}.jpg')
            open(fn, 'wb').write(img)
            picks.append({'n': n, 'title': p['title'], 'page': ii.get('descriptionurl'), 'licence': lic,
                          'licence_url': strip(m.get('LicenseUrl', {}).get('value')),
                          'artist': strip(m.get('Artist', {}).get('value'))[:120], 'thumb': ii['thumburl']})
            if len(picks) >= 6:
                break
            time.sleep(1.5)
        meta[rid] = picks
        print(rid, len(picks), flush=True)
        json.dump(meta, open(meta_path, 'w'), indent=1, ensure_ascii=False)

if __name__ == '__main__':
    main(sys.argv[1])
