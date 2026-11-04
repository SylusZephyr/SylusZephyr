"""Writes launcher icons and splash images into the Android project from resources/."""
import glob, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
icon = Image.open(os.path.join(ROOT, 'resources', 'icon.png')).convert('RGBA')
fg = Image.open(os.path.join(ROOT, 'resources', 'icon-foreground.png')).convert('RGBA')
splash = Image.open(os.path.join(ROOT, 'resources', 'splash.png')).convert('RGB')

DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in DENS.items():
    folder = os.path.join(RES, f'mipmap-{d}')
    os.makedirs(folder, exist_ok=True)
    n = round(48 * k)
    icon.resize((n, n), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
    mask = Image.new('L', (n, n), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, n - 1, n - 1), fill=255)
    r = icon.resize((n, n), Image.LANCZOS); r.putalpha(mask)
    r.save(os.path.join(folder, 'ic_launcher_round.png'))
    f = round(108 * k)
    fg.resize((f, f), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))

# Splash: centre-crop the square master to each existing splash size.
for path in glob.glob(os.path.join(RES, 'drawable*', 'splash.png')):
    w, h = Image.open(path).size
    s = max(w, h)
    img = splash.resize((s, s), Image.LANCZOS)
    left, top = (s - w) // 2, (s - h) // 2
    img.crop((left, top, left + w, top + h)).save(path)

# Adaptive icon background colour
colors = os.path.join(RES, 'values', 'ic_launcher_background.xml')
with open(colors, 'w') as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1A1838</color>\n</resources>\n')
print('android assets written')
