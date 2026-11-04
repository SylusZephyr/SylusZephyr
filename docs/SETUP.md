# Setup

Revive works fully offline with no setup. This guide covers the optional cloud features
(sign-in and sync between phone, PC and Android) and building the apps yourself.

## 1. Cloud sync (Supabase, free tier)

1. Create a project at <https://supabase.com> (pick the **Singapore** or **Tokyo** region for China).
2. **SQL Editor** → paste and run `supabase/schema.sql`.
3. **Authentication → Providers → Email**: enable it. Under **Email templates → Magic Link**, make
   sure the body contains `{{ .Token }}` so users receive a 6-digit code, e.g.

   ```
   <h2>Your Revive sign-in code</h2>
   <p style="font-size:28px;letter-spacing:4px"><b>{{ .Token }}</b></p>
   ```
4. **Authentication → URL Configuration → Redirect URLs**, add:
   - `https://syluszephyr.github.io/SylusZephyr/`
   - `com.syluszephyr.revive://auth-callback` (iOS + Android)
   - `revive://auth-callback` (Windows)
5. **Project Settings → API**: copy the *Project URL* and *anon public* key into `js/config.js`
   (or paste them in the app: **Me → Sign in & sync → Connect**).

### Google sign-in (optional)
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID → Web application**.
2. Authorised redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → **Google**: paste the client ID and secret, enable.

Google sign-in needs a VPN in mainland China; email codes work everywhere.

### Publishing new content
Add recipes, tips or stories without releasing an update — see `supabase/seed-content.sql`.
Rows in the `content` table with `published = true` appear in every app on its next launch.

## 2. Building locally

```bash
npm ci
npm run build:web          # copies the web app into www/

# Android
npx cap sync android
cd android && ./gradlew assembleRelease bundleRelease   # needs JDK 21 + Android SDK

# Windows (from Windows, or Linux with wine)
cd desktop && npm ci && npm run dist:win     # installer in desktop/dist/

# iOS (macOS + Xcode)
npx cap sync ios && npx cap open ios
```

Android release signing reads `android/keystore.properties` (never commit it):

```
storeFile=/absolute/path/revive-upload.jks
storePassword=...
keyAlias=revive
keyPassword=...
```

Regenerate icons and splash screens after changing the logo: `node scripts/render-assets.cjs && python3 scripts/android-assets.py`.

## 3. Building in the cloud (GitHub Actions)

**Actions → Build apps → Run workflow**, or push a tag (`git tag v1.0.0 && git push --tags`) to also
create a GitHub Release with the files attached.

Repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Used for |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 revive-upload.jks` |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` | Android signing |
| `MS_STORE_IDENTITY_NAME`, `MS_STORE_PUBLISHER` | Microsoft Store package identity (Partner Center → Product identity) |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64`, `APPLE_TEAM_ID` | iOS / TestFlight |

Set the repository **variable** `IOS_ENABLED=true` once the Apple secrets exist.
