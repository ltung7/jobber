<script lang="ts">
	import { Tooltip } from '@sveltestrap/sveltestrap';
    type TooltipPlacement = 'left' | 'top' | 'bottom' | 'right';
    
    interface Props {
        text?: string;
        class?: string;
        placement?: TooltipPlacement;
        hoverText?: string;
        tooltipClass?: string;
        children?: import('svelte').Snippet;
        hover?: import('svelte').Snippet;
        hide?: boolean;
    }

    let {
        text = '',
        class: className = 'cursor-help',
        placement = "bottom",
        hoverText = '',
        tooltipClass = '',
        children,
        hover,
        hide
    }: Props = $props();
    
    let element = $state<HTMLElement>();
</script>

<span class={className} bind:this={element}>
    {#if children}{@render children()}{:else}
        {text}
    {/if}
</span>

{#if hide !== true}
    <Tooltip target={element} {placement}>
        <span class="tooltip-text {tooltipClass}">{#if hover}{@render hover()}{:else}{@html hoverText}{/if}</span>
    </Tooltip>
{/if}