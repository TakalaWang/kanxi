import { parse } from 'node-html-parser';
import type { Show } from '../../types';
import { politeFetch, sleep, extractDateRange, classifyGenre, parseUtikiDetail } from './util';

const LIST_URL = 'https://ticket.com.tw/application/UTK01/UTK0101_06.aspx?TYPE=1&CATEGORY=116';
const DETAIL_URL = (id: string) =>
	`https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID=${id}`;

/**
 * ERA: scrape the theatre list, then enrich each show from its detail page
 * (venue / on-sale / price). ERA blocks suspicious IPs, so detail fetches are
 * paced slowly; failures fall back to list-only data.
 */
export async function scrapeEra(): Promise<Show[]> {
	const res = await politeFetch(LIST_URL);
	const root = parse(await res.text());
	const listed: { id: string; title: string; img: string | null; range: ReturnType<typeof extractDateRange> }[] = [];
	for (const card of root.querySelectorAll('#shows .moreBox')) {
		const href = card.querySelector('a[href]')?.getAttribute('href') ?? '';
		const idMatch = href.match(/PRODUCT_ID=([A-Za-z0-9]+)/);
		if (!idMatch) continue;
		const title = card.querySelector('h4.list-group-item-heading')?.text.trim() ?? '';
		if (!title) continue;
		const img =
			card.querySelector('img.list-group-image')?.getAttribute('data-original') ??
			card.querySelector('img')?.getAttribute('data-original') ??
			null;
		const range = extractDateRange(card.querySelector('.list-group-item-date')?.text.trim() ?? '');
		listed.push({ id: idMatch[1], title, img, range });
	}

	const fast = process.env.ONSTAGE_FAST === '1';
	const shows: Show[] = [];
	for (const item of listed) {
		let venue: string | null = null;
		let onSaleAt: string | null = null;
		let minPrice: number | null = null;
		if (!fast) {
			try {
				const d = await politeFetch(DETAIL_URL(item.id));
				({ venue, onSaleAt, minPrice } = parseUtikiDetail(await d.text()));
				await sleep(700);
			} catch {
				/* keep list-only data */
			}
		}
		shows.push({
			id: `era:${item.id}`,
			source: 'era',
			sourceId: item.id,
			title: item.title,
			category: classifyGenre(item.title),
			startDate: item.range.start,
			endDate: item.range.end,
			venue,
			city: null,
			onSaleAt,
			minPrice,
			maxPrice: null,
			imageUrl: item.img,
			url: DETAIL_URL(item.id),
			description: null,
			organizer: null,
			sessions: []
		});
	}
	return shows;
}
