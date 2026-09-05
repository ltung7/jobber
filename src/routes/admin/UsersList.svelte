<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';
	import { internal } from '$lib/nav/internal';
	import { addToast } from '$lib/toast';

	interface FirebaseUser {
		uid: string;
		email: string | null;
		displayName: string | null;
		photoURL: string | null;
		disabled: boolean;
		createdAt?: string;
		lastSignInAt?: string;
	}

	interface Props {
		users: FirebaseUser[];
	}

	// Props
	let { users }: Props = $props();
</script>

<div class="mb-4">
	<h1 class="fs-5 fw-semibold mb-1">All Users</h1>
	<p class="text-muted" style="font-size:13px;">Manage Firebase Authentication users. Disable or remove access as needed.</p>
</div>

{#if users.length === 0}
	<div class="empty-state">
		<UIcon name="box" size={1} />
		<p>No users found.<br />Create a new user from the admin panel.</p>
	</div>
{:else}
	<div class="form-card" style="padding:0;overflow:hidden;">
		<table class="data-table">
			<thead>
				<tr>
					<th>Email</th>
					<th>Display Name</th>
					<th>UID</th>
					<th>Status</th>
					<th>Created</th>
					<th>Last Sign In</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each users as user (user.uid)}
					<tr>
						<td style="color:#4a6072;font-size:12px;">{user.email ?? '—'}</td>
						<td>
							{user.displayName ?? user.email ?? '—'}
						</td>
						<td style="color:#8fa0ae;font-size:11px;font-family:monospace;">{user.uid.slice(0, 12)}…</td>
						<td>
							<span class="badge" class:bg-success={!user.disabled} class:bg-danger={user.disabled}>
								{user.disabled ? 'Disabled' : 'Active'}
							</span>
						</td>
						<td style="color:#4a6072;font-size:12px;">
							{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—'}
						</td>
						<td style="color:#4a6072;font-size:12px;">
							{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString('en-GB') : 'Never'}
						</td>
						<td>
							<div class="d-flex gap-2">
								<!-- Toggle Enable/Disable button -->
								<button
									class="btn btn-eisg-ghost btn-sm"
									onclick={async () => {
										const response = await internal.patch('/admin/users', {
											uid: user.uid,
											disabled: !user.disabled
										});
										if (response?.success) {
											addToast(user.disabled ? 'User reenabled' : 'User disabled', 'success');
											user.disabled = !user.disabled; // Optimistically update UI
										} else {
											addToast(response?.error ?? 'Failed to update user', 'info');
										}
									}}
									title={user.disabled ? 'Reenable' : 'Disable'}
								>
									<UIcon name={user.disabled ? 'play' : 'pause'} />
									{user.disabled ? 'Reenable' : 'Disable'}
								</button>
								<!-- Reset password button -->
								<button
									class="btn btn-eisg-ghost btn-sm"
									onclick={async () => {
										if (!user.email) {
											addToast('User has no email', 'warning');
											return;
										}
										const response = await internal.del('/admin/users', {
											uid: user.uid,
											email: user.email
										});
										if (response?.success) {
											addToast('Password reset email sent', 'success');
										} else {
											addToast(response?.error ?? 'Failed to reset password', 'info');
										}
									}}
									title="Reset password"
								>
									<UIcon name="key" />
									Reset password
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
