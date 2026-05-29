<script lang="ts">
	import { SOURCE_LABELS, type Show } from '$lib/types';
	import { fmtDateRange, fmtPrice, fmtOnSale, daysUntilOnSale, SOURCE_COLOR } from '$lib/format';
	import Icon from './Icon.svelte';

	let {
		show,
		index = 0,
		onopen
	}: { show: Show; index?: number; onopen: (s: Show) => void } = $props();

	const onSaleDays = $derived(daysUntilOnSale(show.onSaleAt));
	const soon = $derived(onSaleDays !== null && onSaleDays >= 0 && onSaleDays <= 7);
	// Cap the stagger so later cards don't wait too long.
	const delay = $derived(Math.min(index, 12) * 45);
</script>

<button
	type="button"
	onclick={() => onopen(show)}
	style="animation-delay: {delay}ms"
	class="animate-fade-up group flex flex-col overflow-hidden rounded-2xl border border-curtain-100 bg-white text-left shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-curtain-900/10 active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-curtain-500 focus-visible:outline-none"
>
	<div class="relative aspect-[3/2] overflow-hidden bg-curtain-950">
		{#if show.imageUrl}
			<img
				src={show.imageUrl}
				alt={show.title}
				loading="lazy"
				referrerpolicy="no-referrer"
				class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
			/>
		{/if}
		<!-- bottom gradient + reveal-on-hover view hint -->
		<div
			class="absolute inset-0 bg-gradient-to-t from-curtain-950/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		></div>
		<span
			class="absolute bottom-3 left-3 flex translate-y-1 items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-curtain-700 opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
		>
			查看詳情 <Icon name="arrow-up-right" size={13} />
		</span>

		{#if soon}
			<span
				class="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold-400 px-2.5 py-1 text-xs font-semibold text-curtain-950 shadow"
			>
				<Icon name="clock" size={12} />
				{onSaleDays === 0 ? '今天開賣' : `${onSaleDays} 天後開賣`}
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-2 p-4">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {SOURCE_COLOR[show.source]}">
				{SOURCE_LABELS[show.source]}
			</span>
			{#if show.heuristic}
				<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">疑似戲劇</span>
			{/if}
			{#if show.category}
				<span class="text-xs text-gray-400">{show.category}</span>
			{/if}
		</div>

		<h3
			class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-curtain-700"
		>
			{show.title}
		</h3>

		<div class="mt-auto space-y-1.5 pt-1 text-sm text-gray-500">
			<p class="flex items-center gap-1.5">
				<Icon name="calendar" size={14} class="shrink-0 text-gray-400" />
				{fmtDateRange(show)}
			</p>
			{#if show.venue || show.city}
				<p class="flex items-center gap-1.5">
					<Icon name="map-pin" size={14} class="shrink-0 text-gray-400" />
					<span class="line-clamp-1">{show.venue ?? ''}{show.city ? ` · ${show.city}` : ''}</span>
				</p>
			{/if}
			{#if fmtOnSale(show.onSaleAt)}
				<p class="flex items-center gap-1.5 font-medium text-curtain-600">
					<Icon name="ticket" size={14} class="shrink-0" />
					{fmtOnSale(show.onSaleAt)} 開賣
				</p>
			{/if}
			{#if fmtPrice(show)}
				<p class="flex items-center gap-1.5 text-gray-400">
					<Icon name="tag" size={14} class="shrink-0" />
					{fmtPrice(show)}
				</p>
			{/if}
		</div>
	</div>
</button>
