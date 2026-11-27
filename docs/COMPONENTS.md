# Components

Each building block has one implementation. Build screens from these. If none fits, extend
the closest one here and record it in this file. Don't add a look-alike.

The styles live in `css/app.css`, inside `@layer app`. Utility classes (`.mt12`, `.fw6`, …)
sit outside the layer, so they always win over a component rule.

`npm test` enforces two rules:
- No selector is defined twice in the same context. A later "override" copy is how one
  component quietly turns into two.
- Every class in the stylesheet is used by a view.

## Surfaces

| Component | Markup | Variants | Notes |
|---|---|---|---|
| Card | `<section class="card">` | `.tight` (less padding), `.danger` (red hairline), `.cq` (adapts its own layout to its width) | Every card is a size container, so its contents reflow at large text sizes. |
| Section title | `<div class="section-title">Title <a class="link">…</a></div>` | — | Heading above a group of cards. |
| Kicker | `<div class="kicker">` | — | Small label at the top of a card. |
| Notice | `<div class="notice">` | — | Inline information or warning inside a screen. |

## Lists and rows

| Component | Markup | Notes |
|---|---|---|
| List row | `<div class="list-item"><div class="li-ico">…</div><div class="grow">…</div><span class="chev">…</span></div>` | Settings, labs, saved items. Use a `button` or `a` when the row is tappable. |
| Up next row | `.next-list .nx-row > .nx` | Today only: time-ordered actions, with an optional `.nx-quick` button. |
| Wide recipe row | `<a class="rwide">` | A recipe as one row with a thumbnail. |
| Recipe card | `.recipe-grid > .rcard` | Grid tile with a photo or icon hero. |

## Numbers

| Component | Markup | Notes |
|---|---|---|
| Stats strip | `<div class="stats"><div class="stat">…</div>…</div>` | One surface with columns split by hairlines. It drops to two columns in narrow containers. It replaced the old `.macro` tiles. |
| Rings | `rings()` in `views/today.js` | Today's summary only. |
| Ring | `UI.ring(pct, size, stroke, color, label, sub)` | A single progress ring. |

## Controls

| Component | Markup | Variants |
|---|---|---|
| Button | `<button class="btn">` | `.primary` (one per view, the main action), `.secondary`, `.ghost`, `.danger`; size `.sm`; width `.block` |
| Icon button | `<button class="icon-btn" aria-label="…">` | Always has an `aria-label`. |
| Chip | `<button class="chip">` inside `.chips` | `.on` when selected; `.chips.scroll` for one scrolling line |
| Segmented control | `<div class="seg"><button class="on">…</button>…</div>` | Two to five mutually exclusive options. |
| Toggle | `<button class="toggle">` | `.on`. Give it an `aria-label` when there's no visible label next to it. |
| Scale | `UI.scaleButtons(name, n, current, labels)` | Check-in answers, 0–n. |
| Field | `<div class="field"><label>…</label><input></div>` | Inputs, selects and textareas share one base style. |

## Overlays

| Component | Call | Notes |
|---|---|---|
| Sheet | `UI.openSheet(html, { onMount, onClose })` | Bottom sheet on phones, centred dialog on desktop. Announced as a modal dialog by its `h2`. |
| Confirm | `UI.confirmSheet(title, body, okLabel, danger)` | Resolves `true` or `false`. |
| Full screen | `UI.fullscreen(html, { onMount })` | Cook mode, trainer, breathing. |
| Toast | `UI.toast(msg)` / `UI.undoToast(msg, onUndo, ms, extra)` | The undo toast can carry one extra action, such as Change. |
| Celebration | `UI.celebrate({ big, title, body })` | Milestones only. |

## States

| Component | Call | Notes |
|---|---|---|
| Empty state | `UI.emptyState({ icon, title, body, action, attr })` | The only empty state: an explanation and at most one action. Never a bare "0" or "No data". |
| Chart empty | `<div class="chart-empty">` | Inside a chart's frame, so the layout doesn't jump when data arrives. |
