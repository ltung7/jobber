<script lang="ts">
	interface Props {
		text?: string;
		paragraphs?: string[];
		class?: string;
	}

	let { text = '', paragraphs = [], class: className = '' }: Props = $props();

	let computedParagraphs = $derived(
		paragraphs.length > 0
			? paragraphs
			: text
					.split(/\n\s*\n/)
					.map((p) => p.trim())
					.filter((p) => p.length > 0)
	);
</script>

<div class="contract-renderer {className}">
	{#each computedParagraphs as para, i}
		{@const lines = para.split('\n')}
		{@const heading = lines[0]}
		{@const body = lines.slice(1).join('\n')}
		<div class="mb-2.5 p-2.5 bg-white border border-slate-200 rounded-3 shadow-xs">
			<div class="fw-bold text-slate-900 text-xs mb-1 text-center pb-1 border-bottom border-slate-100">
				§{i + 1}. {heading}
			</div>
			{#if body.trim()}
				<p class="mb-0 text-xs text-slate-700 line-height-14 text-justify" style="white-space: pre-wrap;">{body}</p>
			{/if}
		</div>
	{/each}
</div>

<style>
	.text-justify {
		text-align: justify;
	}
</style>
