<script>
	import { onMount } from 'svelte';

	let { url = '' } = $props();

	let canShare = $state(false);
	let copied = $state(false);

	onMount(() => {
		canShare = !!navigator.share;
	});

	async function handleShare() {
		try {
			await navigator.share({ title: document.title, url: url || location.href });
		} catch (err) {
			if (err.name !== 'AbortError') console.error(err);
		}
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(url || location.href);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch (err) {
			console.error(err);
		}
	}
</script>

{#if canShare}
	<button class="btn btn-outline-primary mb-0" onclick={handleShare} aria-label="Share">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="18" cy="5" r="3" />
			<circle cx="6" cy="12" r="3" />
			<circle cx="18" cy="19" r="3" />
			<line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
			<line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
		</svg>
		<span class="ms-2">Share Link</span>
	</button>
{:else}
	<button class="btn btn-outline-primary mb-0" onclick={handleCopy} aria-label={copied ? 'Copied' : 'Copy link'}>
		{#if copied}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 6L9 17l-5-5" />
			</svg>
			<span class="ms-2">Copied!</span>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="13" height="13" rx="2" />
				<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
			</svg>
			<span class="ms-2">Copy Link</span>
		{/if}
	</button>
{/if}