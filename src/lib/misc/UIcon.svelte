<script lang="ts">
    interface Props {
        name?: string;
        size?: string|number;
        color?: string;
        class?: string;
        gradient?: boolean;
    }

    let {
        name = "",
        size = 6,
        color = 'inherit',
        class: addClass = "",
        gradient = false
    }: Props = $props();
    
</script>

<i class="fi flex-center fi-rr-{name} fs-{size} text-{color} {addClass}" class:text-gradient={gradient}></i>