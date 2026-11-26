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
- [ ] Visual regression: baseline screenshots of every screen and sheet, at phone and desktop width, in 3 languages. CI fails when a pixel diff goes over the threshold without an updated baseline.
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
- [ ] Remove every inline `style="…"` from views (currently ~200) in favour of named classes.
- [ ] Component inventory with one implementation each: card, list row, stats strip, button (primary/secondary/ghost/sm), chip, segmented control, sheet, empty state, field. Delete duplicates (`.macro` → `.stat`, `.grid3` tiles).
- [ ] Empty and zero states for every list and chart: an explanation and one action, never a bare "0" or "No data yet".
- [ ] Motion spec: durations 150/250 ms, one easing; sheets and tab changes only; reduced-motion respected.

## Phase 3 — The daily loop

What people open the app for every day.

- [x] Log a meal in ≤2 taps from Today (recents first, one-tap re-log).
- [ ] Log water and coffee in 1 tap, with undo.
- [x] Morning check: last night's sleep pre-filled from the plan, confirmed with one tap.
- [ ] Reminders: verify that each scheduled notification fires on Android and iOS. Show the next reminder on Today.
- [ ] Training session: resume after interruption, and screen-off safe timing.
- [ ] Weekly summary that says what changed and what to do next week, in one screen.

## Phase 4 — Scale and reliability

- [ ] State size and render time stay within budget with 3 years of data (already tested), and with 10 years.
- [ ] Storage quota errors are handled, with export offered.
- [ ] Crash and error log viewer in Settings (local only).
- [ ] Accessibility: screen-reader pass of every flow; text size 200% without overlap.
- [ ] Low-end Android: first paint < 1.5 s and tab switch < 100 ms at 4× CPU slowdown.

## Phase 5 — Release engineering

- [ ] CHANGELOG.md generated from releases.
- [ ] Version bump script that updates every place the version lives.
- [ ] Signed release builds published on version tags.
