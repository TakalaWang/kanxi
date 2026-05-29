import type { Show, Session } from '../../types';
import { politeFetch, sleep, classifyGenre, looksTheatrical, cityFromText, htmlToText } from './util';

// Accupass is a large general-purpose event platform (lectures, courses, expos,
// markets, concerts, …); theatre is a small slice. Its web front-end is a Next.js
// SPA, but the listing data comes from a clean JSON endpoint we can call directly:
//
//   POST https://api.accupass.com/v3/search/SearchEvents
//   body: { categoryTypeList, simpleEventPlaceTypeList, cityLocationList,
//           sortBy, timeType, keyword, currentIndex }
//   → { total, items: [{ eventIdNumber, name, photoUrl, startDateTime (UTC),
//                         endDateTime (UTC), location (English city), tags }] }
//
//   timeType "0"  = upcoming (not-yet-ended) events only
//   currentIndex  = 0-based page number, 25 items per page
//
// Per-event detail (venue / address / organizer / description) is server-rendered
// into the /event/<id> page as schema.org JSON-LD, which we parse without a browser.
const SEARCH_API = 'https://api.accupass.com/v3/search/SearchEvents';
const EVENT_URL = (id: string) => `https://www.accupass.com/event/${id}`;

// Keyword search is noisy (matches "舞台" in "認識舞台音響" lectures, "戲劇工作坊"
// courses, etc.), so we query a theatre whitelist and then filter every hit
// through util.looksTheatrical to drop non-theatre matches.
const KEYWORDS = [
	'音樂劇',
	'舞台劇',
	'戲劇',
	'劇場',
	'話劇',
	'即興',
	'脫口秀',
	'喜劇',
	'兒童劇',
	'歌仔戲',
	'相聲',
	'偶戲'
];

const PAGES_PER_KEYWORD = 2; // 25 items/page → up to 50 candidates per keyword
const MAX_DETAIL_FETCHES = 80; // cap detail-page enrichment to stay polite

// Extra Accupass-specific noise the shared looksTheatrical blacklist doesn't cover:
// online courses, school enrollment, reading/derivative events that merely mention
// 戲劇/劇場 in their title but aren't actual performances.
const EXTRA_NON_THEATRE =
	/線上課|學士班|碩士班|進修|招生|甄試|導覽|讀書|書店|工藝|體驗營|夏令營|冬令營|營隊|徵件|徵選|甄選|比賽|競賽/;

// Accupass returns city as an English label; map to the normalised Chinese city
// so it matches the rest of the aggregator (detail-page address is preferred).
const EN_CITY: Record<string, string> = {
	'Taipei City': '臺北市',
	'New Taipei City': '新北市',
	'Keelung City': '基隆市',
	'Taoyuan City': '桃園市',
	'Hsinchu City': '新竹市',
	'Hsinchu County': '新竹縣',
	'Miaoli County': '苗栗縣',
	'Taichung City': '臺中市',
	'Changhua County': '彰化縣',
	'Nantou County': '南投縣',
	'Yunlin County': '雲林縣',
	'Chiayi City': '嘉義市',
	'Chiayi County': '嘉義縣',
	'Tainan City': '臺南市',
	'Kaohsiung City': '高雄市',
	'Pingtung County': '屏東縣',
	'Yilan County': '宜蘭縣',
	'Hualien County': '花蓮縣',
	'Taitung County': '臺東縣',
	'Penghu County': '澎湖縣',
	'Kinmen County': '金門縣',
	'Lienchiang County': '連江縣'
};

interface SearchItem {
	eventIdNumber: string;
	name: string;
	photoUrl?: string;
	startDateTime?: string; // ISO, UTC (e.g. 2026-07-08T10:00:00Z)
	endDateTime?: string;
	location?: string; // English city, e.g. "Taipei City"
	tags?: { name: string }[];
}

interface SearchResponse {
	total?: number;
	items?: SearchItem[];
}

interface LdEvent {
	'@type'?: string;
	name?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	image?: string;
	location?: { name?: string; address?: string };
	organizer?: { name?: string };
}

/** UTC ISO timestamp → YYYY-MM-DD in the Taipei timezone. */
function isoToTaipeiDate(iso: string | undefined): string | null {
	if (!iso) return null;
	const t = new Date(iso);
	if (Number.isNaN(t.getTime())) return null;
	return t.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

/** Call the JSON search endpoint for one keyword + page. Returns [] on any failure. */
async function searchPage(keyword: string, currentIndex: number): Promise<SearchItem[]> {
	try {
		const res = await politeFetch(SEARCH_API, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', referer: 'https://www.accupass.com/' },
			body: JSON.stringify({
				categoryTypeList: [],
				simpleEventPlaceTypeList: [],
				cityLocationList: [],
				sortBy: '4',
				timeType: '0', // upcoming only
				keyword,
				currentIndex
			})
		});
		const data = (await res.json()) as SearchResponse;
		return data.items ?? [];
	} catch {
		return []; // blocked / rate-limited / malformed → skip this page
	}
}

/** Parse the first schema.org Event JSON-LD block out of an /event/<id> page. */
function parseEventLd(html: string): LdEvent | null {
	const blocks = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
	for (const m of blocks) {
		try {
			const parsed = JSON.parse(m[1].trim());
			const arr = Array.isArray(parsed) ? parsed : [parsed];
			const ev = arr.find((o) => o && o['@type'] === 'Event');
			if (ev) return ev as LdEvent;
		} catch {
			/* skip malformed block */
		}
	}
	return null;
}

/**
 * Accupass: query a theatre-keyword whitelist against the SearchEvents JSON API,
 * filter out non-theatre noise, then enrich each kept event from its detail page's
 * JSON-LD. Any failure (blocked, no data) yields an empty array so other sources
 * are unaffected. Note: ticket prices are not exposed on the detail HTML (they load
 * in a modal), so minPrice/maxPrice stay null.
 */
export async function scrapeAccupass(): Promise<Show[]> {
	try {
		const fast = process.env.ONSTAGE_FAST === '1';

		// 1. Collect & de-dupe candidates across all keywords/pages.
		const candidates = new Map<string, SearchItem>();
		for (const keyword of KEYWORDS) {
			for (let page = 0; page < PAGES_PER_KEYWORD; page++) {
				const items = await searchPage(keyword, page);
				if (items.length === 0) break; // no more pages for this keyword
				for (const it of items) {
					if (it.eventIdNumber && !candidates.has(it.eventIdNumber)) {
						candidates.set(it.eventIdNumber, it);
					}
				}
				await sleep(400);
			}
		}

		// 2. Keep only events that actually look theatrical (name + tags as hints).
		const kept = [...candidates.values()].filter((it) => {
			const tagText = (it.tags ?? []).map((t) => t.name).join(' ');
			if (EXTRA_NON_THEATRE.test(it.name)) return false;
			return looksTheatrical(it.name, tagText);
		});

		// 3. Build a Show for each, enriching from the detail page unless in fast mode.
		const shows: Show[] = [];
		let detailFetches = 0;
		for (const it of kept) {
			const id = it.eventIdNumber;
			let venue: string | null = null;
			let city: string | null = it.location ? (EN_CITY[it.location] ?? null) : null;
			let description: string | null = null;
			let organizer: string | null = null;
			let imageUrl: string | null = it.photoUrl ?? null;
			let startDate = isoToTaipeiDate(it.startDateTime);
			let endDate = isoToTaipeiDate(it.endDateTime);

			if (!fast && detailFetches < MAX_DETAIL_FETCHES) {
				try {
					const page = await politeFetch(EVENT_URL(id));
					const ld = parseEventLd(await page.text());
					detailFetches++;
					await sleep(400);
					if (ld) {
						venue = ld.location?.name ?? venue;
						city = cityFromText(ld.location?.address ?? ld.location?.name) ?? city;
						description = htmlToText(ld.description);
						organizer = ld.organizer?.name ?? null;
						imageUrl = ld.image ?? imageUrl;
						startDate = ld.startDate ? ld.startDate.slice(0, 10) : startDate;
						endDate = ld.endDate ? ld.endDate.slice(0, 10) : endDate;
					}
				} catch {
					/* keep list-only data for this event */
				}
			}

			shows.push({
				id: `accupass:${id}`,
				source: 'accupass',
				sourceId: id,
				title: it.name,
				category: classifyGenre(it.name),
				startDate,
				endDate,
				venue,
				city,
				onSaleAt: null, // Accupass doesn't expose on-sale time on the detail HTML
				minPrice: null,
				maxPrice: null,
				imageUrl,
				url: EVENT_URL(id),
				description,
				organizer,
				sessions: [] as Session[]
			});
		}
		return shows;
	} catch {
		return []; // never throw — a single source must not break the others
	}
}
