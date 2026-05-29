export function thumb(url: string | null | undefined, width: number): string | null {
	if (!url) return null;
	if (url.startsWith('data:')) return url;
	return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=72`;
}
