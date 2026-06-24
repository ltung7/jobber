<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';
	import { internal } from '$lib/nav/internal';
	import { env } from '$env/dynamic/public';
	import { fade } from 'svelte/transition';
	import { addToast } from '$lib/toast';
	import getBrowserInfo from '$lib/utils/getBrowserInfo';

	// Props (view passed from parent)
	interface Props extends FeedbackRequestProps {}
	const { view }: Props = $props();

	let message = $state('');
	let email = $state('');
	let sent = $state(false);
	let sending = $state(false);

	async function sendFeedback() {
		// Basic validation: ensure message is sufficiently long and email looks valid
		const minMessageLength = 10;
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailPattern.test(email)) {
			addToast('Invalid email address', 'warning');
			return;
		}
		if (message.trim().length < minMessageLength) {
			addToast(`Feedback message too short (minimum ${minMessageLength} characters)`, 'warning');
			return;
		}

		const browserData = getBrowserInfo();

		const data: FeedbackData = {
			...browserData,
			message,
			email,
			version: env.PUBLIC_APP_VER,
			view
		};
		try {
			sending = true;
			await internal.post('feedback', data);
			sending = false;
			sent = true;

			setTimeout(() => {
				sent = false;
			}, 30000);
		} catch (e) {
			console.error('Feedback send failed', e);
		}
	}
</script>

<div class="page-header mb-4">
	<h1 class="fs-5 fw-semibold mb-1">Feedback</h1>
	<p class="text-muted" style="font-size:13px;">Wyślij feedback lub zgłoś problem z aplikacją.</p>
</div>

<form onsubmit={(event) => { event.preventDefault(); sendFeedback() }}>
	<div class="position-relative">
		<div class="form-card">
			<div class="form-card-title">Feedback</div>
			<div class="row g-3">
				<div class="col-12">
					<label class="field-label" for="feedback-content"> Treść Twojej wiadomości – opisz zauważony błąd lub podziel się opinią </label>
					<textarea id="feedback-content" class="form-control" rows="10" bind:value={message} placeholder="Szczegółowy opis problemu, kroki do odtworzenia błędu lub konstruktywna opinia na temat funkcjonalności..."></textarea>
				</div>

				<div class="col-12">
					<label class="field-label" for="feedback-email"> Twój adres e-mail – byśmy mogli odpowiedzieć </label>
					<input id="feedback-email" type="email" class="form-control" bind:value={email} placeholder="np. jan.kowalski@example.com" />
				</div>
			</div>
		</div>
		{#if sent}
			<div class="position-absolute top-0 start-0 w-100 h-100 flex-center flex-column bg-white z-index-5 d-flex justify-content-center align-items-center" transition:fade style="border-radius: 12px;">
				<h3 class="text-center text-success">Dziekujemy za feedback</h3>
				<a href="#reset" class="text-secondary small" onclick={(e) => { e.preventDefault(); sent = false; sending = false; }}>
					[Wyślij ponownie]
				</a>
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="d-flex gap-2 justify-content-end mt-2 mb-4">
		<button class="btn btn-primary" onclick={sendFeedback} disabled={sent || sending}>
			<UIcon name="envelope" />
			Wyślij feedback
		</button>
	</div>
</form>
