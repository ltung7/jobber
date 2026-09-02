<script lang="ts">
	import { addToast } from '$lib/toast';
	import { onMount } from 'svelte';
	import { ACCOMMODATION_OPTION_LIST, BENEFITS_LIST, CONTRACT_OPTION_LIST_EN, SHIFT_OPTION_LIST_EN, T_LABELS } from './const';
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		showPreviewModal: boolean;
		previewData: JobFormData | SavedOffer;
		archivePreview: (previewData: JobFormData | SavedOffer) => Promise<void>;
		doSave: (d: JobFormData) => void;
	}
	let { showPreviewModal = $bindable(), previewData, doSave, archivePreview }: Props = $props();

	let previewTab = $state<PreviewTab>('offer');
	let pdfGenerating = $state(false);

	function buildOfferHTML(d: JobFormData, lang: Lang): string {
		const t = T_LABELS[lang];
		const dateStr = d.availableFrom ? new Date(d.availableFrom).toLocaleDateString('en-GB') : '';
		const now = new Date().toLocaleDateString('en-GB');
		let rate = `${d.rateTo} PLN per hour ${d.rateNet ? 'net' : 'gross'}`;
		if (d.rateFrom !== d.rateTo) rate = `from ${d.rateFrom} to ` + rate;

		const row = (label: string, val: string) => (val ? `<div style="margin-bottom:8px;"><strong style="font-size:10px;color:#005258;text-transform:uppercase;letter-spacing:0.06em;">${label}:</strong><br><span style="font-size:13px;">${val.replace(/\n/g, '<br>')}</span></div>` : '');
		const sec = (label: string, val: string) => (val ? `<div style="margin-bottom:14px;"><div style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#fff;background:#005258;padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:8px;">${label}</div><div style="font-size:13px;color:#002B49;">${val.replace(/\n/g, '<br>')}</div></div>` : '');

		return `<div style="background:white;color:#002B49;border-radius:10px;padding:28px 32px;font-family:Montserrat,sans-serif;line-height:1.7;width:794px;box-sizing:border-box;">
      <div style="border-bottom:4px solid #C79100;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#002B49;margin-bottom:4px;">${t.offerTitle}</div>
          <div style="font-size:12px;font-weight:700;color:#005258;letter-spacing:0.06em;text-transform:uppercase;">EISG</div>
        </div>
        <div style="font-size:11px;color:#888;text-align:right;">${now}${d.offerRef ? '<br><span style="color:#005258;font-weight:700;">' + t.ref + ': ' + d.offerRef + '</span>' : ''}</div>
      </div>
      <div style="font-size:19px;font-weight:800;color:#002B49;margin-bottom:4px;">${d.jobType}</div>
      <div style="font-size:13px;color:#005258;margin-bottom:16px;font-weight:600;">📍 ${d.location}, ${d.city}</div>
      <div style="background:#e6f2f2;border-left:4px solid #005258;padding:10px 14px;border-radius:0 6px 6px 0;font-weight:700;color:#002B49;margin-bottom:16px;">
        💰 ${t.rate}: ${rate}${d.availableFrom ? '&nbsp;&nbsp;|&nbsp;&nbsp;📅 ' + t.available + ': ' + dateStr : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        ${row(t.contract, CONTRACT_OPTION_LIST_EN[d.contractType])}
        ${row(t.shifts, SHIFT_OPTION_LIST_EN[d.shift])}
        ${row(t.housing, ACCOMMODATION_OPTION_LIST[d.accommodation])}
        ${row(t.benefits, d.benefits.map((item) => BENEFITS_LIST[item]).join(', '))}
      </div>
      ${sec(t.workplaceDesc, d.workplaceDesc)}
      ${sec(t.requirements, d.requirements)}
      ${sec(t.duties, d.duties)}
      ${sec(t.extra, d.extra)}
      <div style="margin-bottom:14px;"><div style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#fff;background:#005258;padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:8px;">${t.contact}</div>
        <div style="font-size:13px;color:#002B49;">
          <div>📱+48 22 266 20 22</div>
          <div>✉️ info@eisg.pl</div>
        </div>
      </div>
      <div style="margin-top:20px;padding-top:12px;border-top:2px solid #C79100;font-size:11px;color:#005258;text-align:center;font-weight:600;letter-spacing:0.04em;">${t.footer}</div>
    </div>`;
	}

	function buildMessengerText(d: JobFormData): string {
		let rate = `${d.rateTo} PLN per hour ${d.rateNet ? 'net' : 'gross'}`;
		if (d.rateFrom !== d.rateTo) rate = `from ${d.rateFrom} to ` + rate;
		const dateStr = d.availableFrom ? new Date(d.availableFrom).toLocaleDateString('en-GB') : 'Immediately';
		let msg = `💼 *JOB OFFER — EISG*\n`;
		if (d.offerRef) msg += `📋 Ref: ${d.offerRef}\n`;
		msg += `\n🔧 *Position:* ${d.jobType}\n`;
		msg += `📍 *Location:* ${d.location}, ${d.city}\n`;
		msg += `💰 *Rate:* ${rate}\n`;
		if (d.contractType) msg += `📄 *Contract:* ${CONTRACT_OPTION_LIST_EN[d.contractType]}\n`;
		if (d.shift) msg += `🕐 *Shifts:* ${SHIFT_OPTION_LIST_EN[d.shift]}\n`;
		msg += `📅 *Available from:* ${dateStr}\n`;
		if (d.accommodation) msg += `🏠 *Accommodation:* ${ACCOMMODATION_OPTION_LIST[d.accommodation]}\n`;
		if (d.benefits) msg += `🎁 *Benefits:* ${d.benefits.map((item) => BENEFITS_LIST[item]).join(', ')}\n`;
		if (d.workplaceDesc) msg += `\n🏭 *About the workplace:*\n${d.workplaceDesc}\n`;
		if (d.requirements) msg += `\n✅ *Requirements:*\n${d.requirements}\n`;
		if (d.duties) msg += `\n📌 *Duties:*\n${d.duties}\n`;
		if (d.extra) msg += `\nℹ️ *Additional info:*\n${d.extra}\n`;
		msg += `\n📞 *Contact:*\n`;
		msg += `📱 +48 222 66 20 22\n`;
		msg += `✉️ info@eisg.pl\n`;
		msg += `\n—\nEISG — Production & Logistics Process Outsourcing`;
		return msg;
	}

	function copyMessenger() {
		if (!previewData) return;
		navigator.clipboard.writeText(buildMessengerText(previewData)).then(() => addToast('Skopiowano do schowka!', 'success'));
	}

	async function generatePDF() {
		if (!previewData) return;
		const d = previewData;
		const lang = d.langExtra;
		pdfGenerating = true;

		const container = document.createElement('div');
		container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;padding:0;margin:0;z-index:-1;';
		container.innerHTML = buildOfferHTML(d, lang);
		document.body.appendChild(container);

		try {
			// @ts-ignore - loaded from CDN
			const { jsPDF } = window.jspdf;
			// @ts-ignore
			await document.fonts.ready;
			await new Promise((r) => setTimeout(r, 300));
			// @ts-ignore
			const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794 });
			const imgData = canvas.toDataURL('image/jpeg', 0.95);
			const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
			const pageW = 210,
				pageH = 297;
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

			addToast('PDF wygenerowany!', 'success');
		} catch (e) {
			console.error(e);
			addToast('Błąd generowania PDF.', 'info');
		} finally {
			document.body.removeChild(container);
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
		<div class="modal-title">Podgląd oferty</div>
		<div class="modal-sub">Język: {T_LABELS[previewData.langExtra].name} · 1 PDF</div>

		<div class="modal-tabs">
			<button class="modal-tab d-flex align-items-center justify-content-center {previewTab === 'offer' ? 'active' : ''}" onclick={() => (previewTab = 'offer')}>
				<UIcon name="eye" class="me-2" /> Podgląd oferty
			</button>
			<button class="modal-tab d-flex align-items-center justify-content-center {previewTab === 'msg' ? 'active' : ''}" onclick={() => (previewTab = 'msg')}>
				<UIcon name="comment" class="me-2" /> Komunikator (EN)
			</button>
		</div>

		{#if previewTab === 'offer'}
			<div class="preview-scale-wrap">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html `<div>${buildOfferHTML(previewData, previewData.langExtra)}</div>`}
			</div>
		{:else}
			<div class="messenger-box">{buildMessengerText(previewData)}</div>
			<div class="d-flex justify-content-end mt-2">
				<button class="btn btn-eisg-ghost btn-sm" onclick={copyMessenger}>
					<UIcon name="copy" />
					Kopiuj do schowka
				</button>
			</div>
		{/if}

		<div class="d-flex gap-2 justify-content-end mt-3 flex-wrap">
			<button class="btn btn-eisg-ghost" onclick={() => (showPreviewModal = false)}>Zamknij</button>
			<button class="btn btn-eisg-success" onclick={() => previewData && doSave(previewData)}>
				<UIcon name="disk" />
				Zapisz ofertę
			</button>
			<button class="btn btn-eisg-primary" onclick={generatePDF} disabled={pdfGenerating}>
				{#if pdfGenerating}
					<span class="spinner-border spinner-border-sm text-primary" style="width: 16px; height: 16px;" role="status" aria-hidden="true"></span>
					Generuję PDF...
				{:else}
					<UIcon name="download" />
					Pobierz PDF ({previewData.langExtra.toUpperCase()})
				{/if}
			</button>
		</div>
	</div>
</div>
