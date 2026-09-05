<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		activeView: View;
		navigateTo: (view: View) => void;
		savedOffersCount: number;
		archivedOffersCount: number;
		loadedArchive: boolean;
	}
	const { activeView, navigateTo, loadedArchive, archivedOffersCount, savedOffersCount }: Props = $props();

	let scrollY = $state(0);
	let scrolled = $derived(scrollY > 56);
</script>

<svelte:window bind:scrollY />

<nav class="sidebar" class:scrolled>
	<div class="sidebar-section">Tools</div>

	<button class="sidebar-item {activeView === 'generator' ? 'active' : ''}" onclick={() => navigateTo('generator')}>
		<UIcon name="table-layout" />
		New Form
	</button>

	<button class="sidebar-item {activeView === 'saved' ? 'active' : ''}" onclick={() => navigateTo('saved')}>
		<UIcon name="disk" />
		Saved Offers
		<span class="badge-count">{savedOffersCount}</span>
	</button>

	<button class="sidebar-item {activeView === 'archive' ? 'active' : ''}" onclick={() => navigateTo('archive')}>
		<UIcon name="box" />
		PDF Archive
		<span class="badge-count">{loadedArchive ? archivedOffersCount : '?'}</span>
	</button>

	<div class="sidebar-settings">
		<div class="sidebar-section">Configuration</div>
		<button class="sidebar-item {activeView === 'feedback' ? 'active' : ''}" onclick={() => navigateTo('feedback')}>
			<UIcon name="comment" />
			Feedback
		</button>
		<button class="sidebar-item {activeView === 'settings' ? 'active' : ''}" onclick={() => navigateTo('settings')}>
			<UIcon name="settings" />
			Google Sheets
		</button>
		<a class="sidebar-item" href="/admin">
			<UIcon name="user-permissions" />
			Admin panel
		</a>
	</div>
</nav>
