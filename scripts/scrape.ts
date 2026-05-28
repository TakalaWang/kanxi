/**
 * 抓取 CLI：跑所有來源、寫入資料庫。
 * 用法：npm run scrape        （完整抓取，含 OPENTIX/寬宏 的詳情補抓）
 *      KANXI_FAST=1 npm run scrape  （快速抓取，略過詳情頁）
 */
import { scrapeAll } from '../src/lib/server/scrapers/index';
import { upsertShows } from '../src/lib/server/db';

const start = Date.now();
const { shows, report } = await scrapeAll();

console.log('\n抓取結果：');
for (const r of report) {
	const status = r.ok ? `✓ ${r.count} 筆` : `✗ 失敗：${r.error}`;
	console.log(`  ${r.source.padEnd(10)} ${status}`);
}

const { inserted, total } = upsertShows(shows);
console.log(`\n寫入 ${total} 筆（其中 ${inserted} 筆為新節目），耗時 ${((Date.now() - start) / 1000).toFixed(1)}s`);
