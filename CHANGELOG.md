# Changelog

## 7.2.0
- Today: one tap logs the meal you usually have in a slot, and confirms last night's sleep as planned. Both can be undone.
- Training: hold and rest times come from the clock, so a locked screen can't stretch or skip them. Leaving the app pauses the session.
- Storage: if the phone is full and an entry can't be saved, the app says so and offers a backup file instead of failing silently.
- Design system: one type scale and one corner-radius scale. Repeated inline styles became utility classes, and the old stat tiles were replaced by a single stats strip.
- Monthly recap: new users see when their first recap arrives instead of an empty month.

## 7.1.0
- Onboarding: the prayer step continues as soon as you choose. Continue on the safety step waits for "I understand".
- Chinese and Urdu cover every screen and sheet, including the suggested doctor questions. A test enforces this.
- Two more recipe photos. Recipes without a photo show a tinted tile with an icon instead of initials.
- Lint and type checks run on every build.

## 7.0.0
- Screens update in place instead of being rebuilt, so focus, scrolling and images are kept.
- One stylesheet. Inter is bundled as the app typeface.
- New layouts for the Today header, the Track and Me stats, the Track heatmap and desktop margins. Fixes for Urdu right-to-left layout.
