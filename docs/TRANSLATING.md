# Translating Revive

Revive ships in **English**, **Simplified Chinese (简体中文)** and **Urdu (اردو)**. People pick the language on the first screen of setup or in **Me → Settings → Language**. Otherwise the phone's language is used.

## How it works

Screens are written in English, and the English text itself is the key. This is the same idea as gettext. After every render, `translateTree()` in `js/i18n.js` swaps each visible piece of text for its translation. It also translates the `placeholder`, `aria-label` and `title` attributes.

Numbers never appear in keys. Each run of digits becomes `#`, so one entry covers every value:

| English on screen | Key | Chinese |
| --- | --- | --- |
| `12 min · 520 kcal` | `# min · # kcal` | `# 分钟 · # 千卡` |
| `3 of 7 left` | `# of # left` | `还剩 # 项（共 # 项）` |

The numbers are put back in the same order. If a language needs a different order, use `{1}`, `{2}` … instead of `#`.

Text without an entry stays in English, so a missing line never breaks a screen.

## Adding or fixing a translation

1. Edit a file in `translations/`. Each line is `English<TAB>Chinese<TAB>Urdu`. Lines starting with `//` are comments.
2. Run `python3 scripts/build-locales.py`. It writes `js/locales/zh.js` and `js/locales/ur.js`. It fails if a line has the wrong number of columns or placeholders.
3. Run `npm run build:web` so the offline cache picks up the new files.

## Writing screens that translate well

- Keep a full sentence in one text node. When part of a line changes, like a name, a date or a prayer, put that part in its own `<span>`. The rest then stays one translatable phrase.
- Format dates with `S.prettyDate()` and times with `S.prettyTime()`. Both follow the chosen language. Outside English the clock is 24-hour.
- Mark anything that must never be translated with `data-no-tr`, for example the language picker.

## Adding another language

1. Add it to `LANGUAGES` in `js/i18n.js`. Right-to-left languages also go in `RTL`.
2. Add a column to every `.tsv` file.
3. Extend `scripts/build-locales.py` to write the new catalog.
4. Check the screens. Right-to-left layouts are handled by `[dir="rtl"]` rules in `css/v4.css`.
