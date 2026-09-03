<script lang="ts">
	import OfferForm from '$lib/components/OfferForm.svelte';
	import { INITIAL_FORM } from './const';
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		doSave: (d: JobFormData) => void;
		openPreviewForm: (form: JobFormData) => void;
	}

	const { doSave, openPreviewForm }: Props = $props();

	let form: JobFormData = $state({ ...INITIAL_FORM });

	function saveOffer() {
		doSave({ ...form });
	}

	function openPreview() {
		openPreviewForm(form);
	}

	function resetForm() {
		form = { ...INITIAL_FORM };
	}
</script>

<div class="page-header mb-4">
	<h1 class="fs-5 fw-semibold mb-1">New Job Offer</h1>
	<p class="text-muted" style="font-size:13px;">Fill out the form — select the PDF language and generate the offer.</p>
</div>

<OfferForm bind:form onSave={saveOffer} onPreview={openPreview}>
	<button class="btn btn-eisg-ghost" onclick={resetForm}>
		<UIcon name="rotate-left" />
		Clear
	</button>
</OfferForm>
