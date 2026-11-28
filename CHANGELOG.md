# Changelog

## 7.6.1
- Charts with nothing logged yet (essentials, calories, protein) say how to fill them instead of showing empty axes.
- Urdu: the week strips in Track and Train show Urdu day names instead of English letters.
- The web app is live at https://syluszephyr.github.io/SylusZephyr/ (Safari: Share, then Add to Home Screen).

## 7.6.0
- Text at 200%: no screen runs off the side or clips its text, even on a small phone. Today's summary stacks, delivery cards put the photo above the dish name, and the doctor summary's tables scroll sideways.
- Windows: in a narrow window, the bottom tab bar no longer squeezes in the sidebar's keyboard hints and note, which pushed it off screen.
- PIN keypad: screen readers no longer read out the empty placeholder key, and the Face ID and delete keys have names.
- Empty Credits and Lab results lists use the same empty state as every other list.
- Under the hood: each component has one implementation, and CI compares screenshots of every screen in all three languages.

## 7.5.0
- Notifications arrive in the app's language. Until now reminders, prayer times and Ramadan alerts were always in English.
- Today shows the next reminder the phone will give, at the foot of Up next. Tap it to change your reminders.
- Meal reminders for tomorrow no longer name today's planned recipe.
- Screen readers: every pop-up panel is announced by its title as a dialog, and every button has a name. A test checks all screens.

## 7.4.0
- Coffee in one tap: the tile logs your usual drink. The confirmation offers Change, to pick another drink, and Undo.
- Large text: with big system text or on a small phone, cards stack and rows wrap instead of running off screen. No screen overflows at 1.6× text on a 360 px phone.
- Motion: animations use three durations and one smooth easing, and the phone's reduce-motion setting makes them instant.
- Settings: an error log lists any problems the app caught. It stays on the device, with Copy and Clear.
- Performance is measured and enforced on a slow phone: first paint and tab switches stay within budget, with 10 years of history too.

## 7.3.0
- Weekly review: each number shows its change from the week before, and one concrete focus for the coming week targets the essential you managed least often.
- Empty screens: every empty list and chart explains what to do, with one action where it helps (for example, Log a meal).
- Styling: the last one-off inline styles became named classes. Text alignment now follows reading direction, which is correct in Urdu.
- Dialogs: opening a panel no longer draws a focus ring on phones, and the keyboard only opens where typing is the point.

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
