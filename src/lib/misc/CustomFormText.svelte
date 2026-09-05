<script lang="ts">
    interface Props {
        name?: string;
        value?: string;
        caption?: string;
        size?: number;
        id?: string;
        class?: string;
        placeholder?: string
    }

    let {
        id = Math.random().toString().slice(2),
        name = Math.random().toString().slice(2),
        value = $bindable(''),
        caption,
        size = 4,
        class: addClass = 'my-3',
        placeholder = ''
    }: Props = $props();

    let isFocused = $state(false);
    const onFocus =()=>isFocused=true;
	const onBlur =()=>isFocused=false;
</script>

<div class="mb-3 {addClass}">
    {#if caption}
        <label for={id} class="form-label small" class:is-focused={isFocused}>{caption + ' '}</label>
    {/if}
    <input type="text" class="form-control fs-{size}" bind:value={value} id="input_text_{name}" {placeholder} onfocus={onFocus} onblur={onBlur}>
</div>