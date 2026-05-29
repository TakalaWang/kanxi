/**
 * Scrape CLI: fetch every source and write static/shows.json + static/feed.xml.
 *   npm run scrape              full scrape (includes OPENTIX / KHAM detail pages)
 *   ONSTAGE_FAST=1 npm run scrape   fast scrape (skip detail pages)
 */
import { writeFileSync } from 'node:fs';
import { scrapeAll } from '../src/lib/server/scrapers/index';
import { writeOutputs } from '../src/lib/server/output';

const start = Date.now();
const { shows, report } = await scrapeAll();

console.log('\nScrape report:');
for (const r of report) {
	console.log(`  ${r.source.padEnd(10)} ${r.ok ? `ok ${r.count}` : `failed: ${r.error}`}`);
}

const { count } = writeOutputs(shows);
console.log(
	`\nWrote ${count} active shows to static/shows.json + static/feed.xml in ${((Date.now() - start) / 1000).toFixed(1)}s`
);

// A source that errors OR returns zero rows likely means the source site changed.
// Persist a report so CI can open an alert issue (the scrape itself still succeeds).
const failures = report
	.filter((r) => !r.ok || r.count === 0)
	.map((r) => ({ source: r.source, error: r.ok ? 'returned 0 rows' : (r.error ?? 'unknown') }));
writeFileSync(
	'scrape-report.json',
	JSON.stringify({ failures, report, total: count }, null, 2)
);
if (failures.length) {
	console.log(`\n⚠ ${failures.length} source(s) need attention:`, failures.map((f) => f.source).join(', '));
}
process.exit(0);
