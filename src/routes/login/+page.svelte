<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/toast';
	import type { Auth } from 'firebase/auth';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	let auth: Auth | null = null;
	let googleProvider: any = $state(null);

	onMount(async () => {
		// Load Firebase client auth only in the browser
		const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
		const { app } = await import('$lib/firebase/client');
		if (app) {
			auth = getAuth(app);
			// Initialize Google provider
			googleProvider = new GoogleAuthProvider();
			// Restrict to specific domains (handled by server-side verify)
			googleProvider.setCustomParameters({
				'prompt': 'select_account'
			});
		}
	});

	async function handleEmailLogin(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		if (!auth) {
			error = 'Firebase not initialized';
			loading = false;
			return;
		}

		try {
			const { signInWithEmailAndPassword } = await import('firebase/auth');
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const idToken = await userCredential.user.getIdToken();

			const res = await fetch('/api/sessionLogin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken })
			});

			if (!res.ok) throw new Error('Session creation failed');

			goto('/', { replaceState: true });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Login failed';
			error = msg;
			addToast(msg, 'info');
		} finally {
			loading = false;
		}
	}

	async function handleGoogleLogin() {
		if (!auth || !googleProvider) {
			error = 'Firebase not initialized';
			return;
		}

		try {
			loading = true;
			error = '';

			const { signInWithPopup } = await import('firebase/auth');
			const result = await signInWithPopup(auth, googleProvider);
			const idToken = await result.user.getIdToken();

			const res = await fetch('/api/sessionLogin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idToken, provider: 'google' })
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Session creation failed');
			}

			goto('/', { replaceState: true });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Google sign-in failed';
			error = msg;
			addToast(msg, 'info');
		} finally {
			loading = false;
		}
	}
</script>

<!-- ─── LOGIN PAGE ─────────────────────────────────────────────── -->
<div class="login-page">
	<div class="login-card">
		<h2>EISG — Login</h2>

		<form onsubmit={handleEmailLogin} class="login-form">
			<div class="mb-3">
				<!-- Custom email form component (if exists) -->
				<!-- Using basic input for now -->
				<label for="email" class="field-label">
					Email<span class="req">*</span>
				</label>
				<input
					id="email"
					type="email"
					class="form-control"
					bind:value={email}
					placeholder="your@email.com"
					required
					autocomplete="email"
				/>
			</div>

				<div class="mb-3">
					<label for="password" class="field-label">
						Password<span class="req">*</span>
					</label>
					<input
						id="password"
						type="password"
						class="form-control"
						bind:value={password}
						placeholder="••••••••"
						required
						autocomplete="current-password"
					/>
				</div>

				{#if error}
					<div class="login-error mb-3">{error}</div>
				{/if}

				<button type="submit" class="btn btn-eisg-primary w-100" disabled={loading}>
					<i class="fi fi-rr-sign-in-alt me-2"></i>
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>

			<!-- Divider -->
			<div class="d-flex align-items-center my-3">
				<hr class="flex-grow-1 border-secondary" />
				<span class="px-2 text-muted small">OR</span>
				<hr class="flex-grow-1 border-secondary" />
			</div>

			<!-- Google Sign-In Button -->
			<button
				class="btn btn-eisg-ghost w-100"
				disabled={loading || !googleProvider}
				onclick={() => googleProvider && handleGoogleLogin()}
			>
				<i class="fi fi-rr-google me-2"></i>
				{loading ? 'Connecting...' : 'Sign In with Google'}
			</button>
		</div>
	</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f5f6fa;
	}

	.login-card {
		background: #fff;
		padding: 2.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
		width: 100%;
		max-width: 400px;
		border: 1px solid #d8e4e4;
	}

	.login-card h2 {
		margin-bottom: 1.5rem;
		text-align: center;
		font-family: 'Montserrat', sans-serif;
		color: #002b49;
		font-weight: 700;
		font-size: 22px;
	}

	.login-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.6rem 0.85rem;
		border-radius: 8px;
		font-size: 13px;
		font-family: 'Montserrat', sans-serif;
	}

	/* Add Google icon styles */
	.fi-rr-google {
		display: inline-block;
		width: 16px;
		height: 16px;
		background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="%23ea4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C36.91 2.7 31.11 0 24 0 14.62 0 6.51 5.38 2.42 13.12l7.33 5.7C12.42 13.16 17.18 9.5 24 9.5z"/><path fill="%234285f4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.13h12.94c-.58 2.96-2.27 5.48-4.78 7.18l7.34 5.7c4.29-3.97 7.15-9.83 7.15-16.72z"/><path fill="%23fbbc05" d="M10.53 28.59c-.48-1.45-.76-3-0-4.59l-7.33-5.7C.89 20.46 0 24.65 0 29.5c0 4.84 2.65 9.09 6.56 11.31l7.33-5.7c-2.09-2.04-3.47-4.93-3.47-8.31z"/><path fill="%234285f4" d="M24 48c13.07 0 24.02-4.33 32.08-11.79l-7.34-5.7c-2.58 2.19-5.88 3.49-9.74 3.49-7.82 0-14.58-5.19-16.99-12.34l-7.33 5.7c4.98 9.39 15.04 16.02 26.32 16.02z"/></svg>');
		background-repeat: no-repeat;
		background-size: contain;
		vertical-align: text-bottom;
	}
</style>