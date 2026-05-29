// Descriptions are split out of shows.json (they're the bulk of the payload) and
// fetched once, lazily, when the first detail modal opens.
let cache: Promise<Record<string, string>> | null = null;

export async function loadDescription(id: string): Promise<string | null> {
	cache ??= fetch('/descriptions.json')
		.then((r) => (r.ok ? r.json() : {}))
		.catch(() => ({}));
	const map = await cache;
	return map[id] ?? null;
}
