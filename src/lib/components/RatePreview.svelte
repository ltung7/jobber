<script lang="ts">
	interface Props {
		rateFrom: number;
		rateTo: number;
		rateNet: boolean;
	}

	let { rateFrom, rateTo, rateNet }: Props = $props();
</script>

<div>
	{#if rateFrom === rateTo}
		<div style="text-align: center">
            <b style="color:#16a34a;">{rateTo}</b>
        </div>
	{:else}
		<div style="text-align: center">
            <b style="color:#16a34a;">{rateFrom}</b> 
            <span style="font-size: 10px; color: gray;">to</span>
            <b style="color:#16a34a;">{rateTo}</b>
        </div>
	{/if}
    <div style="font-size: 10px;">PLN per hour <b>{rateNet ? 'net' : 'gross'}</b></div>
</div>
