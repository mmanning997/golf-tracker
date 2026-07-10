# Matt's Golf Tracker

A standalone rebuild of the Cowork golf-tracker artifact, with **real map tiles** (Leaflet + CARTO/OpenStreetMap) — the thing the artifact sandbox couldn't do. Seeded from `Golf Tracker.csv` (45 played + 45 must-play courses).

**Live site:** https://mmanning997.github.io/golf-tracker/

> Note: edits save to each browser's localStorage. The live site and your local dev copy don't share data — use **Data ▾ → Export JSON** / **Import** to move it between them.

## Deploy an update

```bash
npm run build
cd dist && git init -b gh-pages && git add -A && git commit -m "deploy" \
  && git push -f https://github.com/mmanning997/golf-tracker.git gh-pages \
  && cd .. && rm -rf dist/.git
```

## Run it

```bash
cd golf-tracker
npm install      # first time only
npm run dev      # dev server at http://localhost:5173
npm run build    # static build to dist/ (deploy to GitHub Pages or open locally)
```

No backend, no auth. Your edits are saved to the browser's localStorage; use **Data ▾ → Export JSON/CSV** to keep a file backup, and **Import** to restore or move data. The seed files in `src/data/` are the in-repo source of truth.

## Views

- **Courses** — sortable/filterable table (region, difficulty by slope, rating, Top-100, access, replay), per-row Maps/website/edit/replay/delete.
- **Must Play** — wishlist with status (🎯 wishlist · 🗓 planned · ✅ booked · 🦄 unicorn); **"Played it!"** (⛳) moves a course into Courses, carrying access, Top-100 flags, and designer. Each row shows **distance from home** (The Peninsula Club) with a drive-time estimate or ✈️ for flights, a **path-to-play** tag (🟢 book online · 🏨 resort stay · 🤝 need a member · 🙏 pray), the **designer** with a "you've played N" chip linking it to your played history, and a **tee-time countdown** for booked courses. The **Trips** toggle clusters the list geographically (courses within ~65 mi group into one trip, e.g. the six-course Southern Pines pilgrimage).
- **Stats** — KPIs, auto-earned badges with progress, region/difficulty/rating breakdowns, Top-100 lists, designer leaderboard, five-star and replay lists.
- **Map** — played (green, gold ring = 5-star) and Must Play (amber) layers, popups, KML export for Google My Maps.

## Data notes (worth a look)

- **Coordinates** were verified against OpenStreetMap (`leisure=golf_course`), not guessed. Every **played** course is located.
- **6 wishlist courses aren't in OpenStreetMap yet** (too new/private) and have no pin — they show a ⚑ flag in the list and a banner on the map. Add coordinates via the edit form when you have them: **Cabot Citrus Farms**, **The Keep (McLemore)**, **Coal Club**, **Candy Root**, **Old Sawmill**, **Rodeo Dunes**.
- **"Contentment"** is stored with the CSV's city spelling **"Tarphill"** — the real town is **Traphill, NC** (its office registers in Davidson, which fools geocoders). Coordinates are correct; only the city label needs a one-character fix if you want it.
- Your CSV had **45 played courses**, not the 36 in the rebuild spec's appendix — all 45 are seeded.

## Deferred (from the spec's backlog)

- **Handicap-trend tab** — needs `peninsula_club_rounds.csv`, which wasn't included. Drop it in and this is the natural next feature.
- **URL-lookup autofill** — needs a serverless/LLM call; the Add form keeps a plain website field for now.
