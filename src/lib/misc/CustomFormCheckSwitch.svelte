<script lang="ts">
    interface Props {
        name?: string;
        value?: boolean;
        caption?: string;
        checked?: boolean;
        class?: string;
        id?: any;
        size?: number;
        disabled?: boolean;
        onChange?: (ev: Event) => any;
    }

    let {
        name = $bindable(''),
        value = false,
        caption = '',
        checked = $bindable(false),
        class: className = '',
        id = $bindable(null),
        size = 4,
        disabled = false,
        onChange
    }: Props = $props();
    
	if (!id) id="checkbox_" + Math.random();

    if (name.length === 0) name = (Math.random() * 1000000).toFixed(0);
</script>

<div class="form-check form-switch ps-0 is-filled {className}" class:is-filled={checked} style="--size:{6 + size * 5}px">
	<input {name} {value} class="form-check-input ms-auto" type="checkbox" {id} {disabled} bind:checked={checked} onchange={onChange}>
    {#if caption}
	    <label class="form-check-label ms-3 mb-0 text-inherit transition fs-{8 - Math.ceil(size / 2)}" class:fw-bold={checked} for={id}>{caption}</label>
    {/if}
</div>