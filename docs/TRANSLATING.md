# Translating Revive

All shared interface text lives in `js/i18n.js`.

1. Copy the `en` object, rename it to the language code (`ur`, `zh`, `ar`, …) and translate the values.
2. Add it to `MESSAGES`: `const MESSAGES = { en, ur };`
3. The app picks the language from the phone/PC settings automatically (or `settings.locale`).
   Right-to-left languages (Urdu, Arabic) switch the page direction automatically.

Use `t('key')` in views for any new text, and `t('key', { name })` for text with `{name}` placeholders.
Dates and numbers are formatted with the device locale through `Intl`.

Recipe, tip and story content can also be published per language from the cloud `content` table.
