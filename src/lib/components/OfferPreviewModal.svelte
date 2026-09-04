<script lang="ts">
	import { addToast } from '$lib/toast';
	import { onMount } from 'svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import CustomFormSelect from '$lib/misc/CustomFormSelect.svelte';
	import { LANGUAGES } from './const';
	import OfferPreviewPdf from './OfferPreviewPdf.svelte';
	import { buildMessengerText } from './offerGenerateMessageText';

	interface Props {
		showPreviewModal: boolean;
		previewData: JobFormData | SavedOffer;
		archivePreview: (previewData: JobFormData | SavedOffer) => Promise<void>;
		doSave: (d: JobFormData) => void;
	}
	let { showPreviewModal = $bindable(), previewData, doSave, archivePreview }: Props = $props();

	let previewTab = $state<PreviewTab>('offer');
	let pdfGenerating = $state(false);
	let language: Lang = $state('en');

	function copyMessenger() {
		if (!previewData) return;
		navigator.clipboard.writeText(buildMessengerText(previewData, language)).then(() => addToast('Copied to clipboard!', 'success'));
	}

	async function generatePDF(): Promise<void> {
		if (!previewData) return;
		const d = previewData;
		const lang = language;
		pdfGenerating = true;

		const element = document.getElementById('OfferPreviewPdf');
		if (!element) {
			console.error('PDF element #OfferPreviewPdf not found in DOM.');
			addToast('Error generating PDF.', 'info');
			pdfGenerating = false;
			return;
		}

		try {
			// @ts-ignore - loaded from CDN
			const { jsPDF } = window.jspdf;
			// @ts-ignore
			await document.fonts.ready;
			await new Promise((r) => setTimeout(r, 300));

			// @ts-ignore
			const canvas = await html2canvas(element, {
				scale: 2,
				useCORS: true,
				backgroundColor: '#ffffff',
				width: 794,
				windowWidth: 1024,
				onclone: (clonedDoc: Document) => {
					const clonedEl = clonedDoc.getElementById('OfferPreviewPdf');
					if (clonedEl) {
						// Force the cloned element to stay exactly 794px wide regardless of screen size
						clonedEl.style.width = '794px';
						clonedEl.style.minWidth = '794px';
						clonedEl.style.maxWidth = '794px';
						clonedEl.style.transform = 'none';
					}
				}
			});

			const imgData = canvas.toDataURL('image/jpeg', 0.95);
			const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
			const pageW = 210;
			const pageH = 297;
			const imgH = (canvas.height * pageW) / canvas.width;

			if (imgH <= pageH) {
				doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
			} else {
				let yOff = 0;
				const pageHpx = Math.floor(canvas.width * (pageH / pageW));
				while (yOff < canvas.height) {
					const slH = Math.min(pageHpx, canvas.height - yOff);
					const sc = document.createElement('canvas');
					sc.width = canvas.width;
					sc.height = slH;
					sc.getContext('2d')!.drawImage(canvas, 0, -yOff);

					if (yOff > 0) doc.addPage();
					doc.addImage(sc.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, (slH * pageW) / canvas.width);
					yOff += slH;
				}
			}

			const filename = `EISG_${d.jobType.replace(/\s+/g, '_')}_${lang.toUpperCase()}.pdf`;
			doc.save(filename);

			archivePreview(previewData);
			addToast('PDF generated!', 'success');
		} catch (e) {
			console.error(e);
			addToast('Error generating PDF.', 'info');
		} finally {
			pdfGenerating = false;
		}
	}

	onMount(() => {
		previewTab = 'offer';
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	onclick={(e) => {
		if (e.target === e.currentTarget) showPreviewModal = false;
	}}
>
	<div class="modal-box">
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button class="btn-close position-absolute" style="top:16px;right:16px;" onclick={() => (showPreviewModal = false)}></button>
		<div class="modal-title">Offer preview</div>

		<div class="modal-tabs mb-2">
			<button class="modal-tab d-flex align-items-center justify-content-center {previewTab === 'offer' ? 'active' : ''}" onclick={() => (previewTab = 'offer')}>
				<UIcon name="eye" class="me-2" /> Offer preview
			</button>
			<button class="modal-tab d-flex align-items-center justify-content-center {previewTab === 'msg' ? 'active' : ''}" onclick={() => (previewTab = 'msg')}>
				<UIcon name="comment" class="me-2" /> Communicator
			</button>
		</div>
		<div class="mb-2">
			<CustomFormSelect list={LANGUAGES} bind:value={language} />
		</div>

		{#if previewTab === 'offer'}
			<div class="preview-scale-wrap">
				<OfferPreviewPdf offer={previewData} lang={language} />
			</div>
		{:else}
			<div class="messenger-box">{buildMessengerText(previewData, language)}</div>
			<div class="d-flex justify-content-end mt-2">
				<button class="btn btn-eisg-ghost btn-sm" onclick={copyMessenger}>
					<UIcon name="copy" />
					Kopiuj do schowka
				</button>
			</div>
		{/if}

		<div class="d-flex gap-2 justify-content-end mt-3 flex-wrap">
			<button class="btn btn-eisg-ghost" onclick={() => (showPreviewModal = false)}>Close</button>
			<button class="btn btn-eisg-success" onclick={() => previewData && doSave(previewData)}>
				<UIcon name="disk" />
				Save offer
			</button>
			<button class="btn btn-eisg-primary" onclick={generatePDF} disabled={pdfGenerating}>
				{#if pdfGenerating}
					<span class="spinner-border spinner-border-sm text-primary" style="width: 16px; height: 16px;" role="status" aria-hidden="true"></span>
					Ggenerating PDF...
				{:else}
					<UIcon name="download" />
					Download PDF ({language.toUpperCase()})
				{/if}
			</button>
		</div>
	</div>
</div>
