<script lang="ts">
	import OfferForm from './OfferForm.svelte';

	interface Props {
		editingOffer: SavedOffer;
		close: () => void;
		save: () => void;
		openPreviewForm: (form: JobFormData) => void;
	}

	let { editingOffer = $bindable(), close, save, openPreviewForm }: Props = $props();

	function openPreview() {
		openPreviewForm(editingOffer);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	onclick={(e) => {
		if (e.target === e.currentTarget) close();
	}}
>
	<div class="modal-box wide">
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button class="btn-close position-absolute" style="top:16px;right:16px;" onclick={close}></button>
		<div class="modal-title">Edit Offer</div>
		<div class="modal-sub">{editingOffer.jobType} · {editingOffer.location}, {editingOffer.city} · {editingOffer.id}</div>

		<OfferForm bind:form={editingOffer} onSave={save} onPreview={openPreview}>
			<button class="btn btn-eisg-ghost" onclick={close}>Cancel</button>
		</OfferForm>
	</div>
</div>
