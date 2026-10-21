<script lang="ts">
	import '$lib/assets/custom.css'
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EISG. Job Offer Generator</title>
</svelte:head>

{@render children()}
