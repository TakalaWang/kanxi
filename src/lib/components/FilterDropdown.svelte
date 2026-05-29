<script lang="ts">
	import Icon from './Icon.svelte';

	type Opt = { value: string; label: string };
	type Group = { label: string; children: Opt[] };

	let {
		label,
		selected = $bindable<string[]>([]),
		options = [],
		groups = [],
	}: { label: string; selected?: string[]; options?: Opt[]; groups?: Group[] } = $props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);

	const total = $derived(options.length + groups.reduce((n, g) => n + g.children.length, 0));
	const active = $derived(selected.length > 0 && selected.length < total);

	$effect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	});

	function toggle(v: string) {
		selected = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
	}
	function toggleGroup(children: Opt[]) {
		const vals = children.map((c) => c.value);
		const allOn = vals.every((v) => selected.includes(v));
		selected = allOn
			? selected.filter((v) => !vals.includes(v))
			: [...new Set([...selected, ...vals])];
	}
	function indeterminate(node: HTMLInputElement, value: boolean) {
		node.indeterminate = value;
		return {
			update(v: boolean) {
				node.indeterminate = v;
			},
		};
	}
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-sm transition dark:bg-white/5 {active
			? 'border-curtain-500 text-curtain-600'
			: 'border-gray-300 text-gray-700 hover:border-curtain-400 dark:border-white/15 dark:text-gray-200'}"
	>
		{label}
		<Icon name="chevron-down" size={14} class="transition-transform {open ? 'rotate-180' : ''}" />
	</button>
	{#if open}
		<div
			class="absolute left-0 z-40 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#241b1a]"
		>
			{#each groups as g (g.label)}
				{@const vals = g.children.map((c) => c.value)}
				{@const on = vals.filter((v) => selected.includes(v)).length}
				<label
					class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-800 hover:bg-curtain-50 dark:text-gray-100 dark:hover:bg-white/5"
				>
					<input
						type="checkbox"
						class="accent-curtain-600"
						checked={vals.length > 0 && on === vals.length}
						use:indeterminate={on > 0 && on < vals.length}
						onchange={() => toggleGroup(g.children)}
					/>
					{g.label}
				</label>
				{#each g.children as c (c.value)}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 pl-7 text-sm text-gray-700 hover:bg-curtain-50 dark:text-gray-200 dark:hover:bg-white/5"
					>
						<input
							type="checkbox"
							class="accent-curtain-600"
							checked={selected.includes(c.value)}
							onchange={() => toggle(c.value)}
						/>
						{c.label}
					</label>
				{/each}
			{/each}
			{#each options as o (o.value)}
				<label
					class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-curtain-50 dark:text-gray-200 dark:hover:bg-white/5"
				>
					<input
						type="checkbox"
						class="accent-curtain-600"
						checked={selected.includes(o.value)}
						onchange={() => toggle(o.value)}
					/>
					{o.label}
				</label>
			{/each}
			{#if selected.length}
				<button
					type="button"
					onclick={() => (selected = [])}
					class="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs text-gray-400 hover:text-curtain-600"
				>
					清除
				</button>
			{/if}
		</div>
	{/if}
</div>
