<script lang="ts">
	import { addToast } from '$lib/toast';
	import { internal } from '$lib/nav/internal';

	// Form state
	let formData = $state({
		email: '',
		password: '',
		displayName: ''
	});

	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	let { newUserAdded }: { newUserAdded: (user: FirebaseUser) => void } = $props();

	async function handleCreateUser() {
		submitting = true;
		error = null;
		success = null;

		try {
			const response = await internal.post('/admin/users', formData);

			if (response?.success) {
				success = 'User created successfully!';
				addToast('User created successfully!', 'success');
				formData = { email: '', password: '', displayName: '' };
				newUserAdded(response.user);
			} else {
				error = response?.error || 'Failed to create user';
				addToast(error!, 'info');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to create user';
			error = msg;
			addToast(msg, 'info');
		} finally {
			submitting = false;
		}
	}

	function handleReset() {
		formData = { email: '', password: '', displayName: '' };
		error = null;
		success = null;
	}
</script>

<!-- ─── ADMIN: CREATE USER ─────────────────────────────────────── -->
<div class="admin-users-page">
	<div class="page-header mb-4">
		<h1 class="h4 mb-0">Create User</h1>
		<p class="text-muted mt-1">Add a new user to Firebase Authentication using admin API</p>
	</div>

	<div class="form-card">
		<div class="form-card-title">
			<i class="fi fi-rr-user-plus"></i>
			User Details (Admin API)
		</div>

		<div class="row g-3">
			<div class="col-md-6">
				<label for="email" class="field-label">
					Email<span class="req">*</span>
				</label>
				<input
					type="email"
					id="email"
					name="email"
					class="form-control"
					bind:value={formData.email}
					placeholder="user@example.com"
					required
					autocomplete="email"
				/>
			</div>

			<div class="col-md-6">
				<label for="displayName" class="field-label">Display Name</label>
				<input
					type="text"
					id="displayName"
					name="displayName"
					class="form-control"
					bind:value={formData.displayName}
					placeholder="John Doe"
					autocomplete="name"
				/>
			</div>

			<div class="col-md-6">
				<label for="password" class="field-label">
					Password<span class="req">*</span>
				</label>
				<input
					type="password"
					id="password"
					name="password"
					class="form-control"
					bind:value={formData.password}
					placeholder="••••••••"
					required
					minlength="6"
					autocomplete="new-password"
				/>
				<div class="hint">Minimum 6 characters</div>
			</div>
		</div>

		{#if error}
			<div class="alert alert-danger mt-3" role="alert">
				<i class="fi fi-rr-circle-exclamation me-2"></i>
				{error}
			</div>
		{/if}

		{#if success}
			<div class="alert alert-success mt-3" role="alert">
				<i class="fi fi-rr-circle-check me-2"></i>
				{success}
			</div>
		{/if}

		<div class="d-flex gap-2 mt-4">
			<button type="button" class="btn btn-eisg-primary" disabled={submitting} onclick={handleCreateUser}>
				<i class="fi fi-rr-user-plus me-2"></i>
				{submitting ? 'Creating...' : 'Create User'}
			</button>
			<button type="button" class="btn btn-eisg-ghost" disabled={submitting} onclick={handleReset}>
				<i class="fi fi-rr-rotate-left me-2"></i>
				Reset
			</button>
		</div>
	</div>
</div>