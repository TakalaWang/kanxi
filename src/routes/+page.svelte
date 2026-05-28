<script lang="ts">
	import { enhance } from '$app/forms';
	import { SOURCE_LABELS, type Source, type Show } from '$lib/types';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const allSources = Object.keys(SOURCE_LABELS) as Source[];

	let query = $state('');
	let activeSources = $state<Set<Source>>(new Set());
	let city = $state('');
	let includeHeuristic = $state(true);
	let sort = $state<'date' | 'onsale'>('date');

	const cities = $derived(
		[...new Set(data.shows.map((s) => s.city).filter((c): c is string => !!c))].sort()
	);

	function toggleSource(s: Source) {
		const next = new Set(activeSources);
		next.has(s) ? next.delete(s) : next.add(s);
		activeSources = next;
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		let list = data.shows.filter((s) => {
			if (!includeHeuristic && s.heuristic) return false;
			if (activeSources.size && !activeSources.has(s.source)) return false;
			if (city && s.city !== city) return false;
			if (q) {
				const hay = `${s.title} ${s.venue ?? ''} ${s.category ?? ''}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
		list = [...list].sort((a, b) => {
			if (sort === 'onsale') {
				return (a.onSaleAt ?? '9999').localeCompare(b.onSaleAt ?? '9999');
			}
			return (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999');
		});
		return list;
	});

	function fmtDate(s: Show): string {
		if (!s.startDate) return '日期未定';
		const fmt = (d: string) => d.replaceAll('-', '/');
		if (!s.endDate || s.endDate === s.startDate) return fmt(s.startDate);
		return `${fmt(s.startDate)} – ${fmt(s.endDate)}`;
	}

	function fmtPrice(s: Show): string | null {
		if (s.minPrice == null) return null;
		if (s.maxPrice && s.maxPrice !== s.minPrice)
			return `NT$ ${s.minPrice.toLocaleString()}–${s.maxPrice.toLocaleString()}`;
		return `NT$ ${s.minPrice.toLocaleString()}`;
	}

	function fmtOnSale(iso: string | null): string | null {
		if (!iso) return null;
		const d = new Date(iso);
		return d.toLocaleDateString('zh-TW', {
			timeZone: 'Asia/Taipei',
			month: 'numeric',
			day: 'numeric'
		});
	}

	const sourceColor: Record<Source, string> = {
		opentix: 'bg-rose-100 text-rose-800',
		udn: 'bg-amber-100 text-amber-800',
		kham: 'bg-sky-100 text-sky-800',
		era: 'bg-emerald-100 text-emerald-800',
		tixcraft: 'bg-violet-100 text-violet-800'
	};

	let showSubscribe = $state(false);
</script>

<svelte:head>
	<title>看戲 — 台灣戲劇演出整合</title>
	<meta
		name="description"
		content="一個地方看完 OPENTIX、udn、寬宏、年代、拓元 的戲劇演出。搜尋、過濾、訂閱開賣通知。"
	/>
</svelte:head>

<!-- Header -->
<header class="bg-curtain-900 text-white">
	<div class="mx-auto max-w-6xl px-5 py-10">
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">看戲</h1>
		<p class="mt-2 text-lg text-curtain-100/90">一個地方看完台灣所有戲劇演出</p>
		<p class="mt-1 text-sm text-curtain-100/60">
			整合 OPENTIX · udn · 寬宏 · 年代 · 拓元，共 {data.shows.length} 檔戲劇。本站僅整合資訊，購票導回原售票網。
		</p>
	</div>
</header>

<!-- Sticky filter bar -->
<div class="sticky top-0 z-10 border-b border-curtain-100 bg-curtain-50/95 backdrop-blur">
	<div class="mx-auto max-w-6xl space-y-3 px-5 py-4">
		<div class="flex flex-wrap items-center gap-3">
			<input
				type="search"
				bind:value={query}
				placeholder="搜尋劇名、場館、分類…"
				class="min-w-50 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-curtain-500 focus:ring-2 focus:ring-curtain-500/20"
			/>
			<select
				bind:value={city}
				class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-curtain-500"
			>
				<option value="">全部縣市</option>
				{#each cities as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
			<select
				bind:value={sort}
				class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-curtain-500"
			>
				<option value="date">依演出日期</option>
				<option value="onsale">依開賣時間</option>
			</select>
			<button
				onclick={() => (showSubscribe = !showSubscribe)}
				class="rounded-lg bg-curtain-600 px-4 py-2 text-sm font-medium text-white hover:bg-curtain-700"
			>
				訂閱開賣通知
			</button>
		</div>

		<div class="flex flex-wrap items-center gap-2 text-sm">
			{#each allSources as s (s)}
				<button
					onclick={() => toggleSource(s)}
					class="rounded-full border px-3 py-1 transition {activeSources.has(s)
						? 'border-curtain-600 bg-curtain-600 text-white'
						: 'border-gray-300 bg-white text-gray-600 hover:border-curtain-400'}"
				>
					{SOURCE_LABELS[s]}
				</button>
			{/each}
			<label class="ml-auto flex items-center gap-2 text-gray-500">
				<input type="checkbox" bind:checked={includeHeuristic} class="accent-curtain-600" />
				含疑似戲劇（拓元無分類，靠關鍵字推測）
			</label>
		</div>
	</div>
</div>

<!-- Subscribe panel -->
{#if showSubscribe}
	<div class="border-b border-curtain-100 bg-white">
		<div class="mx-auto max-w-6xl px-5 py-5">
			{#if form?.success}
				<p class="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
					已為 <strong>{form.email}</strong> 建立訂閱，有符合的新演出開賣時會寄信通知你。
				</p>
			{:else}
				<form method="POST" action="?/subscribe" use:enhance class="flex flex-wrap items-end gap-3">
					<div class="flex flex-col gap-1">
						<label for="email" class="text-xs text-gray-500">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							placeholder="you@example.com"
							class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-curtain-500"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="keyword" class="text-xs text-gray-500">關鍵字（劇名／劇團）</label>
						<input
							id="keyword"
							name="keyword"
							placeholder="例：果陀、莎士比亞"
							class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-curtain-500"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="source" class="text-xs text-gray-500">來源（選填）</label>
						<select
							id="source"
							name="source"
							class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-curtain-500"
						>
							<option value="">不限來源</option>
							{#each allSources as s (s)}
								<option value={s}>{SOURCE_LABELS[s]}</option>
							{/each}
						</select>
					</div>
					<button
						type="submit"
						class="rounded-lg bg-curtain-600 px-5 py-2 text-sm font-medium text-white hover:bg-curtain-700"
					>
						建立訂閱
					</button>
					{#if form?.error}
						<p class="w-full text-sm text-curtain-600">{form.error}</p>
					{/if}
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- Show grid -->
<main class="mx-auto max-w-6xl px-5 py-6">
	<p class="mb-4 text-sm text-gray-500">符合條件：{filtered.length} 檔</p>
	{#if filtered.length === 0}
		<p class="py-20 text-center text-gray-400">沒有符合條件的演出，試試調整篩選。</p>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as s (s.id)}
				<a
					href={s.url}
					target="_blank"
					rel="noopener noreferrer"
					class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
				>
					<div class="aspect-[3/2] overflow-hidden bg-gray-100">
						{#if s.imageUrl}
							<img
								src={s.imageUrl}
								alt={s.title}
								loading="lazy"
								referrerpolicy="no-referrer"
								class="h-full w-full object-cover transition group-hover:scale-105"
							/>
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-2 p-4">
						<div class="flex items-center gap-2">
							<span class="rounded px-1.5 py-0.5 text-xs font-medium {sourceColor[s.source]}">
								{SOURCE_LABELS[s.source]}
							</span>
							{#if s.heuristic}
								<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">疑似戲劇</span>
							{/if}
							{#if s.category}
								<span class="text-xs text-gray-400">{s.category}</span>
							{/if}
						</div>
						<h3 class="line-clamp-2 font-semibold leading-snug text-gray-900">{s.title}</h3>
						<div class="mt-auto space-y-1 text-sm text-gray-500">
							<p>🗓 {fmtDate(s)}</p>
							{#if s.venue}<p class="line-clamp-1">📍 {s.venue}{s.city ? ` · ${s.city}` : ''}</p>
							{:else if s.city}<p>📍 {s.city}</p>{/if}
							{#if fmtOnSale(s.onSaleAt)}<p class="text-curtain-600">🎟 {fmtOnSale(s.onSaleAt)} 開賣</p>{/if}
							{#if fmtPrice(s)}<p>{fmtPrice(s)}</p>{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</main>

<footer class="border-t border-curtain-100 py-8 text-center text-xs text-gray-400">
	<p>看戲 kanxi · 開源戲劇演出聚合 · 資料即時來自各售票平台公開頁面，著作權屬各主辦單位與售票平台</p>
	<p class="mt-1">本站不販售門票，所有購票連結皆導回官方售票網</p>
</footer>
