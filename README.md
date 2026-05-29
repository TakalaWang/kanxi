# OnStage TW（幕間）

> See every theatre performance in Taiwan in one place.

OnStage TW aggregates **theatre** listings from Taiwan's ticketing platforms onto a single page. Taiwan's ticketing scene is fragmented — some plays are on OPENTIX, others on udn, KHAM, or ERA — so finding "what's on and when it goes on sale" means checking each site one by one. OnStage TW pulls them all together so you can browse once.

It covers **theatre only** (stage plays, musicals, traditional opera, puppetry, children's theatre, crosstalk…) and **excludes concerts and music recitals**.

🔗 **Live site:** https://onstage.takalawang.dev
📦 **Repository:** https://github.com/TakalaWang/onstage-tw

> The UI is in Traditional Chinese because the audience is in Taiwan. The code, docs, and this README are in English.

## Features

- **Single-page browsing** — drama from every source in one grid, with poster, dates, venue, and price.
- **Instant search** — filter by keyword as you type.
- **Multi-dimensional filtering** — by city, category, performance date range (via a calendar), custom price range, on-sale status, and source. Sorting includes performance date (newest/oldest), on-sale time, and price.
- **Detail modal** — click any show for the full info: description, organizer, every session, on-sale time, price tiers, and a deep link back to the official ticketing page.
- **Dark / light mode.**
- **RSS feed** — subscribe to `/feed.xml` in any RSS reader to follow new shows. No email and no backend; notifications are handled entirely by your own reader.
- **Feedback** — one click opens a pre-filled GitHub issue.
- **Infinite scroll**, with an opening-curtain animation.

## Sources

Theatre listings are gathered from four platforms. Each show is further classified into a sub-genre from keywords in its title to power the category filter: 戲曲 (traditional opera) / 偶戲 (puppetry) / 音樂劇 (musical) / 兒童親子 (children & family) / 相聲 (crosstalk) / 舞台劇 (stage play).

| Platform | Method | Theatre filtering |
|---|---|---|
| OPENTIX | Public JSON API | API category |
| udn 售票網 | HTML parsing, enriched via the utiki detail page (venue & price) | Drama category |
| 寬宏 KHAM | HTML parsing | Drama category |
| 年代 ERA | HTML parsing, enriched via the utiki detail page (venue & price) | Drama category |

> tixCraft was evaluated but removed — its catalogue is entirely concerts/tours, not theatre. KKTIX is planned (see [Roadmap](#roadmap)).

## Architecture

OnStage TW is **fully static** — no database, no email, no backend. A scraper produces two files, and a prerendered SvelteKit site reads them.

```
                 npm run scrape (tsx)
 ┌──────────┐    ┌─────────────────┐    static/shows.json ──▶ prerendered SvelteKit page
 │ OPENTIX  │    │                 │───▶
 │ udn      │───▶│  fetch + parse  │    static/feed.xml   ──▶ RSS readers
 │ KHAM     │    │  + enrich       │
 │ ERA      │    │                 │
 └──────────┘    └─────────────────┘

 GitHub Actions (scheduled, twice daily)
   └─▶ scrape ─▶ commit shows.json + feed.xml ─▶ Vercel auto-redeploys
                 (on scrape failure, an alert GitHub issue is opened automatically)
```

The scraper (`npm run scrape`) fetches OPENTIX from its JSON API and parses HTML for udn, KHAM, and ERA; udn and ERA results are enriched with venue and price from their utiki detail pages. It writes `static/shows.json` and `static/feed.xml`. The SvelteKit site (Svelte 5 runes, `adapter-static`) prerenders the page by reading `shows.json` at build time.

## Getting started

```bash
npm install
npm run scrape    # fetches all platforms → static/shows.json + static/feed.xml (requires network)
npm run dev       # http://localhost:5173
```

Fast mode skips the detail-page enrichment (quicker, less complete):

```bash
ONSTAGE_FAST=1 npm run scrape
```

## Tech stack

SvelteKit (Svelte 5 runes) · TypeScript · Tailwind CSS v4 · `adapter-static` · `node-html-parser` · `html-to-text` · `tsx`.

## Deployment

The site is deployed on **Vercel**: because it is fully static, every `git push` triggers an automatic deploy. A scheduled GitHub Action runs the scraper twice a day and commits the refreshed `shows.json` and `feed.xml`, which triggers a redeploy — no secrets required. If a scrape fails, the workflow opens a GitHub issue as an alert. Any static host works equally well.

## Data & license

Only **factual fields** are stored (title, dates, venue, on-sale time, source link). Poster images are hot-linked rather than re-hosted, and ticket links always point back to the official platform. Each program's text and images remain the copyright of its organizer and ticketing platform. Scraping is low-frequency and the source is always attributed; please don't use the project in ways that violate the platforms' terms of service.

Code is released under the [MIT](./LICENSE) license.

## Roadmap

- [ ] **KKTIX** as a fifth source.
- [ ] **Calendar view** for browsing by date.
- [ ] More per-source session info (e.g. additional on-sale and session details from each platform's detail pages).
