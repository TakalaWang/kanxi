# OnStage TW（幕間）

> See every theatre performance in Taiwan in one place.

Taiwan's theatre ticketing is fragmented across OPENTIX, udn, KHAM, ERA, KKTIX and Accupass. **OnStage TW** scrapes all of them into one searchable page, so you can find what's on — and when it goes on sale — without checking each site.

Theatre only (stage plays, musicals, traditional opera, puppetry, children's theatre, crosstalk, comedy…); concerts and music recitals are excluded.

🔗 **Live:** https://onstage.takalawang.dev · 📦 **Repo:** https://github.com/TakalaWang/onstage-tw

> UI is in Traditional Chinese (the audience is in Taiwan). Code, docs and this README are in English.

## Features

- **List view**, **calendar view** (`/calendar`) and **map view** (`/map`), plus a prerendered **per-show page** at `/event/[id]` (own title, OG tags and schema.org Event JSON-LD, so individual shows are indexable).
- **Search & filtering** — keyword, city (matches any touring city), category/sub-genre, date range, custom price range, on-sale status, source; sort by date / on-sale / price. Filters collapse behind a toggle.
- **Detail modal** — description, organizer, running time / age, every session (date + venue + city), price, program-intro images, and a deep link to buy. Plus **add-to-calendar (.ics)** with an on-sale reminder, and **share**.
- **Favourites** — star shows (stored locally), filter to just those.
- **Dark / light mode**, **PWA** (installable, works offline), infinite scroll, opening-curtain animation.
- **RSS** — `/feed.xml`, plus per-source (`/feed-<source>.xml`) and per-genre (`/feed-genre-<slug>.xml`) feeds. No email, no backend; your reader handles notifications.
- **Feedback** — one click opens a pre-filled GitHub issue.

## Sources

| Platform        | Method                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| OPENTIX 兩廳院  | Public JSON API (list + detail)                                           |
| udn 售票網      | HTML; detail pages add sessions, venue, price, description                |
| 寬宏 KHAM       | HTML; detail meta + body add sessions, description, on-sale               |
| 年代 ERA        | HTML; detail GridView adds sessions, venue, price, description, organizer |
| KKTIX           | Per-organizer `events.json` + per-event schema.org JSON-LD                |
| Accupass 活動通 | `SearchEvents` JSON API (theatre keywords) + per-event JSON-LD            |

Each show is classified into a sub-genre from its title (戲曲 / 偶戲 / 音樂劇 / 兒童親子 / 相聲 / 喜劇 / 舞台劇) for the category filter. tixCraft was evaluated and dropped — its catalogue is concerts/tours, not theatre.

## Architecture

Fully static — no database, no backend, no email.

```
OPENTIX · udn · KHAM · ERA · KKTIX · Accupass
        │  pnpm scrape (tsx)
        ▼
  fetch + parse + enrich ──▶ static/shows.json        ──▶ prerendered SvelteKit pages
                         ├─▶ static/descriptions.json  ──▶ lazy-loaded by the modal
                         ├─▶ static/feed*.xml          ──▶ RSS readers
                         └─▶ static/sitemap.xml        ──▶ search engines

GitHub Actions (twice daily): scrape ─▶ commit data ─▶ Vercel redeploys
  ├─ on scraper failure (a source errors or returns 0), opens an alert issue
  └─ venues that can't be resolved to a city roll up into one tracking issue
```

The pages read the committed `shows.json` at build time (prerendered with `adapter-static`, including every `/event/[id]`); favourites, calendar, map, .ics and theme are all client-side.

## Getting started

Requires **Node 24** and **pnpm** (`corepack enable` will provide it).

```bash
pnpm install
pnpm scrape         # all sources → static/shows.json + descriptions + feeds + sitemap (needs network)
pnpm dev            # http://localhost:5173
```

### All commands

```bash
pnpm dev            # dev server
pnpm build          # production build (prerendered static site → build/)
pnpm preview        # serve the production build locally
pnpm check          # svelte-check (types)
pnpm lint           # prettier --check + eslint
pnpm format         # prettier --write
pnpm scrape         # full scrape of every source (re-generates all static data)
pnpm export         # re-generate shows.json + feeds + sitemap from the existing snapshot
ONSTAGE_FAST=1 pnpm scrape   # skip detail-page enrichment (faster, less complete)
```

See `.env.example` for the optional `ONSTAGE_*` overrides (all have defaults).

## Tech stack

SvelteKit (Svelte 5 runes) · TypeScript · Tailwind CSS v4 · `adapter-static` · Leaflet (map) · `node-html-parser` · `html-to-text` · `tsx` · pnpm · ESLint + Prettier.

## Data & license

Only factual fields are stored (title, dates, venue, on-sale, link); poster images are hot-linked, and ticket links go back to the official platform, which holds the copyright. Scraping is low-frequency and attributed. Code is [MIT](./LICENSE).
