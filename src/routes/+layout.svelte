<script lang="ts">
	import '$lib/assets/custom.css'
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EISG. Generator Ofert Pracy</title>
</svelte:head>

{@render children()}
