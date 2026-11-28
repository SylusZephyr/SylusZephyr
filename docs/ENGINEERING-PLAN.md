# Revive engineering plan

The standard: every screen should hold up next to the best apps in its category
(Apple Health, Oura, Yazio, Headspace) on a cheap Android phone, in Chinese and Urdu,
offline. Work goes top to bottom. An item is done only when its check passes, and it ships in a
release with signed builds.

## How work is done

1. Pick the first unchecked item below.
2. Measure before changing: a screenshot, a test, or a number.
3. Make the change in the smallest coherent commit.
4. Verify:
   - `npm test`
   - `npm run test:e2e`
   - `npm run lint` and `npm run typecheck`, once phase 1 adds them
   - screenshots at phone and desktop width, in English, 中文 and اردو
5. Tick the item here in the same commit, then open a PR. Merge when CI is green, and build signed installers for each minor version.

## Phase 1 — Engineering gates

Mistakes should be caught by machines, not by the user.

- [x] Type-check all JavaScript with `tsc --checkJs` (JSDoc types for the state shape). CI fails on any error.
- [x] ESLint with a strict rule set (no unused variables, no implicit globals, eqeqeq). CI fails on any warning.
- [x] Visual regression: baseline screenshots of every screen and sheet, at phone and desktop width, in 3 languages. CI fails when a pixel diff goes over the threshold without an updated baseline. (`npm run test:visual`: 69 screenshots covering 15 phone screens, 5 desktop screens and 3 sheets, in EN/ZH/UR. The clock, data, randomness and motion are fixed, and the fonts are named explicitly, so two machines render the same. A screen fails above 0.2% changed pixels; a 2 px padding change fails 20 screens. Accept an intended change with `npm run test:visual -- --update`.)
- [x] Computed-style snapshot tool (`scripts/style-snapshot.mjs`) committed, for safe CSS refactors.
- [x] Check that every UI string has a translation (no English left in zh/ur on any screen or sheet, not only main screens).

## Phase 2 — Design system

One way to build each thing.

- [x] Token scales documented in `css/app.css`:
  - spacing (4/8/12/16/24/32)
  - type (12/13/15/17/22/28/34)
  - radius (8/12/16)
  - colour roles

  No raw pixel values outside the scales.
- [x] Remove every inline `style="…"` from views in favour of named classes. (Only data-driven values, SVG stops and the standalone print document stay inline.)
- [x] Component inventory with one implementation each: card, list row, stats strip, button (primary/secondary/ghost/sm), chip, segmented control, sheet, empty state, field. Delete duplicates (`.macro` → `.stat`, `.grid3` tiles). (See `docs/COMPONENTS.md`. 75 selectors that were defined two or three times, as later "override" copies, are now one rule each. Component rules that had drifted outside the cascade layer are back inside it. Dead variants are gone: glow and cool cards, the green button, and the mobile tab pill. There is one empty state. `npm test` fails on a duplicate selector or an unused class. A computed-style snapshot of 32 screen states showed no visible change.)
- [x] Empty and zero states for every list and chart: an explanation and one action, never a bare "0" or "No data yet".
- [x] Motion spec: tokens `--dur-fast` 150 ms, `--dur` 250 ms, `--dur-slow` 400 ms (progress fills), one `--ease`; reduce-motion makes them instant. (23 durations / 10 easings → 3 / 1; content-timed breathing and timers keep their own.)

## Phase 3 — The daily loop

What people open the app for every day.

- [x] Log a meal in ≤2 taps from Today (recents first, one-tap re-log).
- [x] Log water and coffee in 1 tap, with undo. (Coffee repeats the last drink; the toast offers Change.)
- [x] Morning check: last night's sleep pre-filled from the plan, confirmed with one tap.
- [ ] Reminders: verify that each scheduled notification fires on Android and iOS. Show the next reminder on Today.
  - Done: Today shows the next notification the phone holds (tapping it opens Reminders). The scheduler and Today read one plan (`js/reminders.js`), and notifications are now sent in the app's language (unit-tested for every reminder, prayer and fasting alert in zh/ur).
  - To do: confirm on a real Android phone and iPhone that each one fires.
- [x] Training session: resume after interruption, and screen-off safe timing.
- [x] Weekly summary that says what changed and what to do next week, in one screen.

## Phase 4 — Scale and reliability

- [x] State size and render time stay within budget with 3 years of data (already tested), and with 10 years. (10 years of full logging: 2.4 MB, unit-tested < 4 MB; first paint 270–440 ms and tab switches 13–43 ms at 4× slowdown.)
- [x] Storage quota errors are handled, with export offered.
- [x] Crash and error log viewer in Settings (local only).
- [ ] Accessibility: screen-reader pass of every flow; text size 200% without overlap.
  - Text at 200%: done. At 2× on a 360 px phone (180 px of layout), nothing on 15 screens runs off screen or is clipped by a card (e2e enforced). Data tables in the doctor summary scroll sideways. The desktop app in a narrow window drops the sidebar's keyboard hints from the tab bar.
  - Screen reader (automated): every control on 13 screens and 6 sheets has a name, each screen has one h1, and sheets announce their title as a modal dialog (fixed; e2e enforced). A manual VoiceOver pass on a real iPhone is still to do.
  - axe-core WCAG 2.1 A/AA is clean on all 21 routes and the main sheets in English, and on the five tabs in Chinese and Urdu (e2e enforced; a contrast drop on `.muted` fails it).
- [x] Low-end Android: first paint < 1.5 s and tab switch < 100 ms at 4× CPU slowdown. (Measured: first paint 150–260 ms; tab switches 10–50 ms, with 3 years of history too. e2e enforces it with 2× headroom.)

## Phase 5 — Release engineering

- [x] CHANGELOG.md generated from releases.
- [x] Version bump script that updates every place the version lives.
- [ ] Signed release builds published on version tags.
  - Done: a `v*` tag builds all apps and publishes a GitHub Release with the signed APK. The CI step that restores the signing key never ran (its `if` read an env var it could not see); that is fixed. A tag without the key now fails loudly instead of publishing an uninstallable APK.
  - To do: the owner adds the four `ANDROID_*` secrets (docs/SETUP.md, "Signed releases"); then tag v7.6.0 to confirm.

## Phase 6 — Continuous improvement

Each item comes from an audit of the running app: phone and desktop, EN/ZH/UR, compared with
the best apps in each category. Items are ordered by user impact.

- [x] Bar charts with nothing logged drew bare axes (Track: essentials, calories, protein). They now say how to fill them, like the other charts.
- [x] Week strips used English day initials (S M T…) in Urdu, because Unicode's narrow day names for Urdu are Latin letters. They now use the native short day name. The zh/ur crawl also flags lone Latin capitals, so this can't return.
- [x] Recipe page order: rating and variations came before the steps, so you scrolled past "Your verdict" before cooking. The order is now Ingredients → Steps (with the safety note) → Switch it up → Your verdict.
