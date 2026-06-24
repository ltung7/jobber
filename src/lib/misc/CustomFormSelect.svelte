<script lang="ts">
	import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from '@sveltestrap/sveltestrap';

	// 1. Define the TypeScript interface for your Props
	interface Props {
		value?: string;
		list?: Record<string, string>;
		name?: string;
		autoselect?: boolean | 'default';
		readonly?: boolean;
		size?: number;
		action?: ((val: string) => void) | null;
		class?: string;
	}

	// 2. Use the $props rune with destructuring and default values
	let {
		value = $bindable(''), // $bindable allows two-way binding with the parent
		list = {},
		name = '',
		autoselect = false,
		readonly = false,
		size = 0,
		action = null,
		class: className = '' // Aligns 'class' attribute to 'className' variable
	}: Props = $props();

	// 3. Declare local reactive state using $state
	let isOpen = $state(false);

	// 4. Handle reactive data modifications via $derived
	const computedName = $derived(name.length === 0 ? Math.random().toString().substring(2) : name);

	const computedList = $derived(autoselect === 'default' ? { '': '-', ...list } : list);

	// 5. Handle the auto-select side-effect safely when state properties change
	$effect(() => {
		if (autoselect && autoselect !== 'default' && !value) {
			const firstKey = Object.keys(computedList)[0];
			if (firstKey !== undefined) {
				value = firstKey;
			}
		}
	});

	// 6. Inline functions require typed parameters
	const setValue = (val: string) => {
		value = val;
		if (action) action(val);
	};
</script>

<Dropdown isOpen={isOpen && !readonly} toggle={() => (isOpen = !isOpen)} direction="down">
	<input type="hidden" name={computedName ?? "select"} {value} />

	<DropdownToggle class="flex-between input-group input-group-outline border-secondary is-filled z-index-3 cursor-pointer me-4 {className}" tag="div">
		<span class="form-control fs-{size} {value.length === 0 ? 'text-secondary' : 'text-dark'} pe-3 text-wrap">
			{@html computedList[value] ?? ''}
		</span>
	</DropdownToggle>

	<DropdownMenu class="px-2 w-100 z-index-3 overflow-auto">
		{#each Object.entries(computedList) as [lvalue, lcaption]}
			<DropdownItem onclick={() => setValue(lvalue)} class="my-1 text-wrap {value === lvalue ? 'border rounded border-primary text-primary' : ''} {lvalue.length === 0 ? 'd-none' : ''}">
				{@html lcaption}
			</DropdownItem>
		{/each}
	</DropdownMenu>
</Dropdown>
