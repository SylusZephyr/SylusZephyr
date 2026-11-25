"""Lists (and with --write, removes) CSS rules whose selectors only target classes that no
script or page uses any more. Conservative: a rule stays if any selector in it could match.

usage: python3 scripts/prune-css.py [--write]
"""
import glob, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True)
              + [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'privacy.html')]
              if os.sep + 'locales' + os.sep not in f and os.sep + 'vendor' + os.sep not in f)
# Components that were removed but whose names still occur as ordinary words in content.
RETIRED = {'loot', 'chest', 'quest', 'q-ico', 'reward', 'tipcard', 'stories', 'story', 'story-viewer', 'hero-today', 'hero-sky',
           'hero-level', 'hud', 'stat', 'combo', 'xp-pop', 'ob-badge', 'ob-ambient', 'emoji-scale', 'nudge', 'n-e', 'flame', 'emoji', 'xp'}
used = lambda c: c not in RETIRED and re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', SRC) is not None

def selector_live(sel):
    classes = re.findall(r'\.([a-zA-Z][\w-]*)', re.sub(r':not\([^)]*\)', '', sel))
    return all(used(c) for c in classes)

def prune(css):
    out, i, removed = [], 0, []
    while i < len(css):
        if css.startswith('/*', i):
            j = css.index('*/', i) + 2; out.append(css[i:j]); i = j; continue
        j = css.find('{', i)
        if j < 0: out.append(css[i:]); break
        head = css[i:j]
        depth, k = 1, j + 1
        while depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        h = head.strip()
        if h.startswith('@media') or h.startswith('@supports'):
            inner, r = prune(body); removed += r
            if inner.strip(): out.append(head + '{' + inner + '}')
        elif h.startswith('@'):
            out.append(css[i:k])
        else:
            sels = [s.strip() for s in h.split(',')]
            keep = [s for s in sels if selector_live(s)]
            if keep:
                lead = head[:len(head) - len(head.lstrip())]
                out.append(lead + ', '.join(keep) + ' {' + body + '}')
            else: removed.append(h)
        i = k
    return ''.join(out), removed

for name in ('app.css',):
    p = os.path.join(ROOT, 'css', name); css = open(p, encoding='utf-8').read()
    new, removed = prune(css)
    print(f'{name}: {len(removed)} rules unused')
    for r in removed: print('   ', r[:90])
    if '--write' in sys.argv: open(p, 'w', encoding='utf-8').write(new)
