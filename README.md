# Revive 🔥

A private, offline recovery companion for iPhone — installed free from Safari as a Home Screen app.

**Everything you enter stays on your phone.** This repository contains only generic app code — no personal data.

## Install on iPhone
1. Open **https://syluszephyr.github.io/SylusZephyr/** in **Safari** (not WeChat's browser).
2. Tap **Share → Add to Home Screen → Add**.
3. Always open Revive from that Home Screen icon (it keeps its own private storage).

In China, github.io can be slow — load it once (VPN if needed). After that it works fully offline.

## What's inside
- **Today** — stories, 7 daily essentials (5/7 secures the streak), XP & levels, combos, daily mystery chest, 3 daily quests, water & coffee counters with caffeine cutoff, sleep & energy logging, "you vs. last week", an infinite-style tips feed that **sleeps during wind-down** to protect bedtime.
- **Cook** — "What can I make right now?" suggester (pantry + mood + time + budget + meal), 38 air-fryer / no-cook halal recipes with Chinese shopping names, interactive cook mode with step timers, "switch it up" variations, a one-tap weekly meal plan, pantry, shopping list (¥), and halal Meituan/Ele.me delivery picks.
- **Train** — 12-week guided pelvic-floor program (holds, quick flicks, reverse Kegels), breathing sessions, private stop–start practice log, education cards. Exercise stays locked to gentle walking until you mark doctor clearance.
- **Track** — essentials heatmap, 4-week plan, calories/protein, sleep timeline & wake drift, weekly weigh-ins with 66–68 kg goal band, weekly check-ins (erection & confidence, PHQ-4 mood, energy & cold).
- **Me** — badges, coins & streak freezes, medical follow-up questions, visits, lab results, printable **doctor summary**, calendar reminders (.ics), Face ID + PIN lock, settings.

## Tech
Plain HTML/CSS/ES modules, no build step, service worker for offline. Data in `localStorage`.

Revive supports a plan; it does not diagnose or replace a doctor. Emergency in China: **120**.
