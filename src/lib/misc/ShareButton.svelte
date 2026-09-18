<script>
	import { onMount } from 'svelte';

	let { url = '', title = "Praca EISG" } = $props();

	let canShare = $state(false);
	let copied = $state(false);

	onMount(() => {
		const shareData = {
			title: title || document.title || document.title.trim(),
			url: url || window.location.href
		};
		
		canShare = navigator.share && navigator.canShare(shareData);
	});

	function handleShare(e) {
		// 1. Guard against unsupported browsers/contexts
		if (typeof navigator === 'undefined' || !navigator.share) {
			console.warn('Web Share API is not supported in this environment.');
			return;
		}

		const shareData = {
			title: title || document.title || document.title.trim(),
			url: url || window.location.href
		};

		// 2. Guard against rejected payloads in Safari
		if (navigator.canShare && !navigator.canShare(shareData)) {
			console.warn('Share payload not supported:', shareData);
			return;
		}

		// 3. Execute synchronously on gesture stack
		navigator.share(shareData).catch((err) => {
			if (err.name !== 'AbortError') {
				console.error('Share failed:', err);
			}
		});
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

<div style="display: flex; justify-content-center; align-items: center">
	{#if canShare}
		<button class="btn btn-outline-primary mb-0 me-2" onclick={handleShare} aria-label="Share">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="18" cy="5" r="3" />
				<circle cx="6" cy="12" r="3" />
				<circle cx="18" cy="19" r="3" />
				<line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
				<line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
			</svg>
			<span class="ms-2">Share Link</span>
		</button>
	{/if}
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
</div>
