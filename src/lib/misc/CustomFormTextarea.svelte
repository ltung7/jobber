<script lang="ts">
	import { untrack } from 'svelte';

    interface Props {
        name?: string;
        value?: string;
        caption?: string;
        size?: number;
        class?: string;
        noauto?: boolean;
        id?: any;
        readonly?: boolean;
        onInput?: () => void;
        onChange?: () => void;
    }

    let {
        name = $bindable(''),
        value = $bindable(''),
        caption = '',
        size = 2,
        class: addClass = 'my-3',
        noauto = false,
        id = $bindable(undefined),
        readonly = false,
        onInput,
        onChange
    }: Props = $props();

    let isFocused = $state(false);
    const onFocus =()=>isFocused=true;
	const onBlur =()=>isFocused=false;

    if (!id) {
        if (name.length === 0) {
            name = untrack(() => caption);
            id = 'texty_' + (Math.random() * 900000 + 100000).toFixed(0);
        } else {
            id = 'texty_' + name;
        }
    }
</script>


<div class="mb-3 {addClass}">
    <label for={id} class="form-label small" class:is-focused={isFocused}>{caption}</label>
    <textarea bind:value class="form-control" rows={size} {id} {name} onfocus={onFocus} onblur={onBlur} autocomplete={noauto ? 'off' : ''} {readonly} oninput={onInput} onchange={onChange}></textarea>
</div>