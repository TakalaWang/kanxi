import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, sleep, classifyGenre, parseUtikiDetail } from './util';

const API =
	'https://tickets.udnfunlife.com/Application/UTK01/UTK0101_009.aspx/Product_Category_List';
const DETAIL_URL = (id: string) =>
	`https://tickets.udnfunlife.com/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;
const DRAMA_CATEGORY = '116';

/** udn: POST WebMethod returns the whole theatre category at once; its `script` field is an HTML fragment we parse. */
export async function scrapeUdn(): Promise<Show[]> {
	const res = await politeFetch(API, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ category: DRAMA_CATEGORY, pageNo: '1', pageSize: '999' })
	});
	const json = (await res.json()) as { d?: { ReturnData?: { script?: string } } };
	const html = json.d?.ReturnData?.script;
	if (!html) return [];

	const root = parse(html);
	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const card of root.querySelectorAll('.yd_card')) {
		const link = card.querySelector('a[href]');
		const href = link?.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const id = idMatch[1];

		const title = card.querySelector('.yd_card-title')?.text.trim() ?? '';
		if (!title) continue;
		const img = card.querySelector('img')?.getAttribute('src') ?? null;
		const startDate =
			card.querySelector('meta[itemprop=startDate]')?.getAttribute('content') ?? null;
		const endDate =
			card.querySelector('meta[itemprop=endDate]')?.getAttribute('content') ?? null;
		let venue =
			card.querySelector('[itemprop=location] [itemprop=name]')?.text.trim() ||
			card.querySelector('[itemprop=location]')?.text.trim() ||
			null;
		const priceStr = card.querySelector('meta[itemprop=price]')?.getAttribute('content');
		let minPrice = priceStr ? Number(priceStr.replace(/[^\d]/g, '')) || null : null;
		let onSaleAt: string | null = null;

		// Enrich on-sale time (and any missing venue/price) from the detail page.
		if (!fast) {
			try {
				const d = await politeFetch(DETAIL_URL(id));
				const detail = parseUtikiDetail(await d.text());
				onSaleAt = detail.onSaleAt;
				venue = venue ?? detail.venue;
				minPrice = minPrice ?? detail.minPrice;
				await sleep(400);
			} catch {
				/* keep list-only data */
			}
		}

		shows.push({
			id: `udn:${id}`,
			source: 'udn',
			sourceId: id,
			title,
			category: classifyGenre(title),
			startDate: startDate?.slice(0, 10) ?? null,
			endDate: endDate?.slice(0, 10) ?? null,
			venue,
			city: null,
			onSaleAt,
			minPrice,
			maxPrice: null,
			imageUrl: img,
			url: DETAIL_URL(id),
			description: null,
			organizer: null,
			sessions: []
		});
	}
	return shows;
}
