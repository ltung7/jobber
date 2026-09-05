<script lang="ts">
    interface Props {
        name?: string;
        value?: string;
        caption?: string;
        size?: number;
        id?: string;
        valid?: boolean;
        class?: string;
        placeholder?: string
    }

    let {
        id = Math.random().toString().slice(2),
        name = 'email',
        value = $bindable(''),
        caption = 'E-mail address',
        size = 4,
        class: addClass = 'my-3',
        valid = $bindable(true),
        placeholder = 'your@email.com'
    }: Props = $props();
    const PATTERN = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i;

    let isFocused = $state(false);
    const onFocus =()=>isFocused=true;
	const onBlur =()=>isFocused=false;

    async function validate() {
        valid = true;
        if (value.length > 2 && !value.match(PATTERN)) valid = false;
    }
</script>

<div class="mb-3 {addClass}">
    {#if caption || !valid}
        <label for={id} class="form-label small" class:text-danger={!valid} class:is-focused={isFocused}>{caption + ' '}{valid ? "" : ' - Invalid e-mail address'}</label>
    {/if}
    <input type="text" class="form-control fs-{size} {valid ? '' : 'text-danger'}" bind:value={value} id="input_text_{name}" {placeholder} onfocus={onFocus} onblur={onBlur} oninput={validate}>
</div>