// Cloud settings. Fill these in once your Supabase project exists (see docs/SETUP.md),
// or paste them in the app under Me → Account → Connect project.
// The anon key is safe to ship: row-level security keeps every user's rows private.
export const CLOUD = {
  url: '',
  anonKey: '',
};

// Deep-link targets for OAuth on native shells (must also be allowed in Supabase → Auth → URL Configuration).
export const AUTH_REDIRECT = {
  ios: 'com.syluszephyr.revive://auth-callback',
  android: 'com.syluszephyr.revive://auth-callback',
  desktop: 'revive://auth-callback',
};
