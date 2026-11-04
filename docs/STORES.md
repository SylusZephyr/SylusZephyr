# Publishing Revive

Files for every store come from **Actions → Build apps** (or a local build, see `SETUP.md`).
Privacy policy URL for all stores: `https://syluszephyr.github.io/SylusZephyr/privacy.html`
(available once GitHub Pages is enabled for the `main` branch).

---

## Store listing (shared text)

**Name:** Revive: Recovery & Habits  *(fallback: Revive Health Companion)*

**Short description (≤80):**
Meals, sleep, pelvic-floor training and health tracking — private by design.

**Full description:**
Revive is a private daily companion for getting your energy, eating and sleep back on track.

• Eat more, with less effort — "What can I make?" suggests meals from what's in your kitchen, your mood, time and budget. 38 quick air-fryer and no-cook halal recipes, a guided cook mode with timers, a weekly meal plan and a smart shopping list.
• Search any food — instant nutrition for everyday foods plus millions of packaged products.
• Fix your sleep gently — lock a wake time, shift bedtime 15 minutes every few days, wind-down mode at night.
• Train with guidance — a 12-week pelvic-floor program with animated sessions, breathing exercises and education.
• See your progress — streaks, levels, weekly grades, charts for weight, sleep, nutrition and weekly check-ins, and personal insights about what makes you feel better.
• Ready for your doctor — a one-page summary of your last four weeks to share at appointments.
• Private — works offline with no account. Optional sign-in syncs your phone and PC. App lock with Face ID, fingerprint, Windows Hello or PIN.

Revive is a wellbeing tool, not a medical device. It does not diagnose or treat any condition.

**Category:** Health & Fitness
**Keywords (iOS, ≤100 chars):** habit,meal plan,sleep,kegel,pelvic floor,recipes,halal,weight gain,tracker,wellness
**Age rating:** 17+ / Mature (sexual-health education, no explicit content)

---

## Google Play ($25 one-time)

1. Create a developer account at <https://play.google.com/console> (identity verification takes 1–3 days).
2. **Create app** → name, default language English, App, Free.
3. **App content** (left menu):
   - Privacy policy: the URL above.
   - Ads: *No ads*.
   - App access: *All functionality available without special access* (sign-in is optional).
   - Content rating: run the questionnaire — answer *Yes* to "sexual content or nudity: references in a health/educational context", no violence, no gambling.
   - Target audience: **18 and over**.
   - **Data safety**:
     - Data collected (only when the user signs in): *Email address* (account management), *Health info* and *Fitness info* (app functionality). Not shared. Encrypted in transit. Users can request deletion (in-app).
     - Without sign-in nothing is collected.
   - Health apps declaration: *Health & fitness → nutrition, sleep, physical activity*; not a medical device.
4. **Store listing**: text above, icon `resources/icon.png` (resize to 512×512), feature graphic 1024×500, at least 2 phone screenshots.
5. **Testing → Internal testing** → upload `app-release.aab` → add your email as a tester → install from the Play link.
6. New personal developer accounts must run a **closed test with 12 testers for 14 days** before production access. Then **Production → Create release** → upload the same AAB.
7. Turn on **Play App Signing** (default). Your `revive-upload.jks` is the *upload key* — keep it safe.

**Direct install (no store):** send `app-release.apk` to the phone, open it, allow "Install unknown apps".

---

## Microsoft Store (free for individuals)

1. Register at <https://storedeveloper.microsoft.com> (individual accounts are free).
2. Partner Center → **Apps and games → New product → MSIX or PWA app** → reserve the name *Revive*.
3. **Product management → Product identity**: copy *Package/Identity/Name* and *Package/Identity/Publisher*
   into repository secrets `MS_STORE_IDENTITY_NAME` and `MS_STORE_PUBLISHER`, run the workflow → `Revive*.appx`.
4. Create a submission: pricing Free, category Health & fitness, age rating questionnaire (IARC),
   privacy policy URL, upload the `.appx`, screenshots (1366×768 or larger), description from above.
5. The Store signs the package; certification usually takes 1–3 days.

**Without the Store:** `Revive-Setup-x.y.z.exe` installs per-user with Start-menu and desktop shortcuts.
Windows SmartScreen may warn on unsigned installers — click *More info → Run anyway*, or buy a
code-signing certificate later to remove the warning.

---

## Apple App Store ($99/year) — when ready

1. Enrol at <https://developer.apple.com/programs/> (an individual account is fine).
2. App Store Connect → **Apps → +** → bundle ID `com.syluszephyr.revive`, name, SKU `revive`.
3. Users and Access → **Integrations → App Store Connect API** → generate a key (*App Manager*).
   Add secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` (`base64 -i AuthKey_XXXX.p8`),
   `APPLE_TEAM_ID`; set variable `IOS_ENABLED=true`.
4. Run **Build apps** with *Upload to TestFlight* ticked. The build appears in TestFlight in ~15 minutes.
5. App Privacy: same answers as Google's Data safety. Age rating 17+ (medical/treatment information).
   Review notes: *"Sign-in is optional; all features work without an account. Health content is
   educational wellbeing guidance, not diagnosis."*
6. Screenshots: 6.9" iPhone (1320×2868) — at least 3.
