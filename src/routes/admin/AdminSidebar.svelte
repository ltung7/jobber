<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		activeView: AdminView;
		navigateTo: (view: AdminView) => void;
	}
	const { activeView, navigateTo }: Props = $props();

	let scrollY = $state(0);
	let scrolled = $derived(scrollY > 56);
</script>

<svelte:window bind:scrollY />

<nav class="sidebar" class:scrolled>
	<div class="sidebar-section">Tools</div>

	<button class="sidebar-item {activeView === 'users' ? 'active' : ''}" onclick={() => navigateTo('users')}>
		<UIcon name="people" />
		Users
	</button>

	<button class="sidebar-item {activeView === 'new' ? 'active' : ''}" onclick={() => navigateTo('new')}>
		<UIcon name="add" />
		New User
	</button>

	<div class="sidebar-settings">
		<div class="sidebar-section">Configuration</div>
		<button class="sidebar-item" onclick={async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; }}>
			<UIcon name="sign-out-alt" />
			Log out
		</button>
	</div>
</nav>
