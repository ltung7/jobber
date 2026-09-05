<script lang="ts">
	import type { PageData } from './$types';
	import Toasts from '$lib/toast/Toasts.svelte';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import NewUserView from './NewUserView.svelte';
	import AdminSidebar from './AdminSidebar.svelte';
	import { goto } from '$app/navigation';
	import { internal } from '$lib/nav/internal';
	import UsersList from './UsersList.svelte';

	let { data }: { data: PageData } = $props();

	let users: FirebaseUser[] = $state([]);

	const loadUsers = async () => {
		const response = await internal.get('/admin/users');
		if (response.users) users = response.users;
	};

	// Client-side safety net: if the server load didn't redirect (e.g. SPA navigation), check user
	onMount(() => {
		if (!data?.user) goto('/login', { replaceState: true });

		loadUsers();
	});

	function newUserAdded(user: FirebaseUser) {
		users.push(user);
	}

	let activeView = $state<AdminView>('users');
	let previousView = $state<AdminView>('users');

	async function navigateTo(view: AdminView) {
		previousView = activeView;
		activeView = view;
	}
</script>

<Toasts />

<!-- ─── APP SHELL ─────────────────────────────────────────────────────── -->
<div class="app-grid">
	<!-- Topbar -->
	<header class="topbar">
		<div class="topbar-logo">
			<img title="EISG" alt="EISG" src="https://eisg.pl/wp-content/uploads/2015/12/eisg_logo.png" />
		</div>
		<div class="topbar-divider"></div>
		<div class="topbar-sub d-flex justify-content-between align-items-center w-100">
			<h4 class="mb-0 fw-bolder text-dark">Zarządzanie</h4>
			<div class="small text-secondary">({env.PUBLIC_APP_VER})</div>
		</div>
	</header>

	<!-- Sidebar -->
	<AdminSidebar {activeView} {navigateTo} />

	<!-- Main area -->
	<main class="main-area">
		<!-- ─── VIEW: GENERATOR ─── -->
		{#if activeView === 'new'}
			<NewUserView {newUserAdded} />
		{/if}

		{#if activeView === 'users'}
			<UsersList {users} />
		{/if}
	</main>
</div>
