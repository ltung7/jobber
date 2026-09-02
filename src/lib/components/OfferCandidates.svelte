<script lang="ts">
	import { confirmSuccess, internal } from '$lib/nav/internal';
	import { addToast } from '$lib/toast';
	import { onMount, untrack } from 'svelte';

	interface Props {
		offer: SavedOffer;
		showCandidateModal: boolean;
		setSaved: (offer: SavedOffer) => Promise<void>;
	}
	let { offer, showCandidateModal = $bindable(), setSaved }: Props = $props();
	let candidates = $state(untrack(() => offer.candidates));

	let candidateForm = $state<CandidateForm>({
		firstName: '',
		lastName: '',
		passport: '',
		contact: '',
		notes: ''
	});

	function addCandidate() {
		if (!candidateForm.firstName && !candidateForm.lastName) {
			addToast('Podaj imię lub nazwisko.');
			return;
		}
		offer.candidates.push({ ...candidateForm, addedAt: new Date().toISOString() });
		setSaved(offer);
		candidateForm = { firstName: '', lastName: '', passport: '', contact: '', notes: '' };
	}

	function removeCandidate(cidx: number) {
		if (!confirm('Usunąć kandydata?')) return;

		offer.candidates = candidates.splice(cidx, 1);
		setSaved(offer);
	}

	onMount(() => {
		candidateForm = { firstName: '', lastName: '', passport: '', contact: '', notes: '' };
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	onclick={(e) => {
		if (e.target === e.currentTarget) showCandidateModal = false;
	}}
>
	<div class="modal-box cand">
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button class="btn-close position-absolute" style="top:16px;right:16px;" onclick={() => (showCandidateModal = false)}></button>
		<div class="modal-title">{offer?.jobType ?? 'Candidates'}</div>
		<div class="modal-sub">{offer?.location}{offer?.offerRef ? ' · ' + offer.offerRef : ''}</div>

		<!-- Candidate list -->
		{#if candidates.length === 0}
			<div style="text-align:center;padding:20px;color:#8fa0ae;font-size:13px;">No candidates. Add the first one below.</div>
		{:else}
			{#each candidates as c, i (i)}
				<div class="candidate-card">
					<div class="candidate-field"><b>Full name</b><span>{c.firstName} {c.lastName}</span></div>
					<div class="candidate-field"><b>Passport No.</b><span>{c.passport || '—'}</span></div>
					<div class="candidate-field">
						<b>Contact</b><span style="color:#4a6072;">{c.contact || '—'}</span>{#if c.notes}<span style="font-size:11px;color:#4a6072;">{c.notes}</span>{/if}
					</div>
					<div style="display:flex;align-items:flex-start;padding-top:4px;">
						<button class="btn btn-eisg-danger btn-sm" onclick={() => removeCandidate(i)}>✕</button>
					</div>
				</div>
			{/each}
		{/if}

		<hr />
		<div style="font-size:13px;font-weight:600;color:#002B49;margin-bottom:10px;">+ Add candidate</div>
		<div class="add-candidate-form">
			<div class="row g-2 mb-2">
				<div class="col-md-3">
					<label class="field-label" for="firstName">First name</label>
					<input id="firstName" type="text" class="form-control form-control-sm" placeholder="e.g. Raj" bind:value={candidateForm.firstName} />
				</div>

				<div class="col-md-3">
					<label class="field-label" for="lastName">Last name</label>
					<input id="lastName" type="text" class="form-control form-control-sm" placeholder="e.g. Karki" bind:value={candidateForm.lastName} />
				</div>

				<div class="col-md-3">
					<label class="field-label" for="passport">Passport No.</label>
					<input id="passport" type="text" class="form-control form-control-sm" placeholder="N1234567" bind:value={candidateForm.passport} />
				</div>

				<div class="col-md-3">
					<label class="field-label" for="contact">Contact</label>
					<input id="contact" type="text" class="form-control form-control-sm" placeholder="phone no. / WhatsApp" bind:value={candidateForm.contact} />
				</div>
			</div>

			<div class="mb-2">
				<label class="field-label" for="notes">Additional information</label>
				<textarea id="notes" class="form-control form-control-sm" rows="2" placeholder="e.g. Experience, preferences, document status..." bind:value={candidateForm.notes}></textarea>
			</div>

			<div class="d-flex justify-content-end">
				<button class="btn btn-eisg-primary btn-sm" onclick={addCandidate}>Add candidate</button>
			</div>
		</div>

		<div class="d-flex justify-content-end mt-3">
			<button class="btn btn-eisg-ghost" onclick={() => (showCandidateModal = false)}>Close</button>
		</div>
	</div>
</div>
