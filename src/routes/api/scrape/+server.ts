import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { scrapeAll } from '$lib/server/scrapers';
import { upsertShows } from '$lib/server/db';

/**
 * POST /api/scrape  — 供排程（cron）觸發抓取。
 * 需在 header 帶 `Authorization: Bearer <KANXI_SCRAPE_TOKEN>`。
 * 若未設定 KANXI_SCRAPE_TOKEN 則拒絕（避免誤開放）。
 */
export const POST: RequestHandler = async ({ request }) => {
	const token = env.KANXI_SCRAPE_TOKEN;
	if (!token) throw error(503, '未設定 KANXI_SCRAPE_TOKEN');
	if (request.headers.get('authorization') !== `Bearer ${token}`) throw error(401, 'Unauthorized');

	const { shows, report } = await scrapeAll();
	const { inserted, total } = upsertShows(shows);
	return json({ report, inserted, total });
};
