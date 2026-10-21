<script lang="ts">
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import type { ContractTemplate } from '$lib/server/db/firebase/recruiterContract.fdb';
	import type { Contractor } from '$lib/server/db/firebase/recruiterContractor.fdb';
	import { addToast } from '$lib/toast';
	import dayjs from 'dayjs';

	interface Props {
		isOpen: boolean;
		contract: ContractTemplate | null;
		contractors?: Contractor[];
	}

	let {
		isOpen = $bindable(false),
		contract = null,
		contractors = []
	}: Props = $props();

	let selectedContractorId = $state<string>('');
	const activeContractor = $derived.by(() => {
		if (selectedContractorId) {
			const found = contractors.find((c) => c.id === selectedContractorId);
			if (found) return found;
		}
		const defaultC = contractors.find((c) => c.isDefault);
		if (defaultC) return defaultC;
		if (contractors.length > 0) return contractors[0];
		return {
			name: 'EISG Sp. z o.o.',
			nip: '5252637218',
			regon: '363065097',
			krs: '0000588661',
			address: 'ul. Złota 59, 00-120 Warszawa',
			email: 'biuro@eisg.pl',
			phone: '+48 22 123 45 67'
		};
	});

	let isGenerating = $state(false);
	let pdfContainerEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (isOpen) {
			const defaultC = contractors.find((c) => c.isDefault) || contractors[0];
			if (defaultC?.id) {
				selectedContractorId = defaultC.id;
			}
		}
	});

	const plParagraphs = $derived(
		(contract?.plText || '')
			.split(/\n\s*\n/)
			.map((p: string) => p.trim())
			.filter((p: string) => p.length > 0)
	);

	const enParagraphs = $derived(
		(contract?.enText || '')
			.split(/\n\s*\n/)
			.map((p: string) => p.trim())
			.filter((p: string) => p.length > 0)
	);

	const maxParagraphs = $derived(Math.max(plParagraphs.length, enParagraphs.length));
	const todayFormatted = $derived(dayjs().format('DD.MM.YYYY'));

	async function generateAndOpenPdf() {
		if (!pdfContainerEl) return;

		isGenerating = true;
		try {
			addToast('Generating bilingual PDF...', 'info');

			// @ts-ignore - loaded from CDN
			const { jsPDF } = window.jspdf;
			// @ts-ignore
			await document.fonts?.ready;
			await new Promise((r) => setTimeout(r, 200));

			// @ts-ignore
			const canvas = await html2canvas(pdfContainerEl, {
				scale: 2,
				useCORS: true,
				backgroundColor: '#ffffff',
				width: 794,
				windowWidth: 1024
			});

			const pageW = 210;
			const pageH = 297;
			const imgH = (canvas.height * pageW) / canvas.width;
			const doc = new jsPDF('p', 'mm', 'a4');

			if (imgH <= pageH) {
				const imgData = canvas.toDataURL('image/jpeg', 0.95);
				doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
			} else {
				let yOff = 0;
				const pxPerMm = canvas.width / pageW;
				const maxSliceH = Math.floor(pageH * pxPerMm);

				while (yOff < canvas.height) {
					const slH = Math.min(maxSliceH, canvas.height - yOff);
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = canvas.width;
					tempCanvas.height = slH;
					const ctx = tempCanvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(canvas, 0, yOff, canvas.width, slH, 0, 0, canvas.width, slH);
					}

					if (yOff > 0) doc.addPage();
					const sliceData = tempCanvas.toDataURL('image/jpeg', 0.95);
					doc.addImage(
						sliceData,
						'JPEG',
						0,
						0,
						pageW,
						(slH * pageW) / canvas.width
					);
					yOff += slH;
				}
			}

			const pdfBlob = doc.output('blob');
			const pdfUrl = URL.createObjectURL(pdfBlob);
			window.open(pdfUrl, '_blank');
			addToast('Bilingual PDF opened in new tab!', 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error generating PDF.', 'danger');
		} finally {
			isGenerating = false;
		}
	}
</script>

<ClosableModal
	bind:isOpen
	size="xl"
	headerText={`Bilingual PDF Document Preview: ${contract?.title || ''}`}
>
	<div class="p-2">
		<!-- Top Controls Toolbar -->
		<div class="p-3 bg-slate-50 border border-slate-200 rounded-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
			<div class="d-flex align-items-center gap-2">
				<span class="text-xs fw-bold text-slate-700 text-uppercase">Contractor Company (Party 1):</span>
				<select
					class="form-select form-select-sm text-xs border-slate-200 bg-white"
					style="min-width: 260px;"
					value={selectedContractorId || activeContractor.id || ''}
					onchange={(e) => (selectedContractorId = e.currentTarget.value)}
				>
					{#each contractors as c (c.id || c.nip)}
						<option value={c.id}>
							{c.name} (NIP: {c.nip}){c.isDefault ? ' [Default]' : ''}
						</option>
					{/each}
				</select>
			</div>

			<div class="d-flex align-items-center gap-2">
				<span class="badge rounded-pill bg-purple-subtle text-purple border border-purple-subtle px-2.5 py-1 text-xs fw-semibold">
					🇵🇱 PL ({plParagraphs.length} §) &bull; 🇬🇧 EN ({enParagraphs.length} §)
				</span>
				<button
					type="button"
					class="btn btn-primary btn-sm px-3 shadow-xs d-inline-flex align-items-center gap-1.5"
					onclick={generateAndOpenPdf}
					disabled={isGenerating}
				>
					{#if isGenerating}
						<span class="spinner-border spinner-border-sm" role="status"></span>
						<span>Rendering PDF...</span>
					{:else}
						<UIcon name="download" size="6" />
						<span>Open / Print PDF</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- VISIBLE LIVE SCROLLABLE PREVIEW CONTAINER -->
		<div class="border border-slate-300 rounded-3 p-3 bg-slate-100" style="max-height: 70vh; overflow-y: auto;">
			<div
				bind:this={pdfContainerEl}
				style="width: 794px; margin: 0 auto; background: #ffffff; color: #111111; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.45; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); box-sizing: border-box;"
			>
				<!-- Header Date -->
				<div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 20px;">
					<div style="font-size: 11px; color: #555555;">
						Warszawa / Warsaw, Data / Date: {todayFormatted}
					</div>
				</div>

				<!-- Title Banner: Bilingual -->
				<div style="text-align: center; margin-bottom: 20px;">
					<h2 style="margin: 0; font-size: 16px; font-weight: 700; text-transform: uppercase; color: #0f172a; letter-spacing: 0.02em;">
						UMOWA REKOMENDACYJNA &bull; RECOMMENDATION AGREEMENT
					</h2>
					<div style="font-size: 11px; color: #64748b; margin-top: 4px;">
						Program rekomendacji pracowników {activeContractor.name} &bull; {activeContractor.name} Employee Recommendation Program
					</div>
				</div>

				<!-- Parties Section: Two Bordered Columns -->
				<div style="display: flex; gap: 12px; margin-bottom: 18px;">
					<!-- Left Column: Polish Parties -->
					<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; box-sizing: border-box; font-size: 11px;">
						<div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
							STRONY UMOWY:
						</div>
						<div style="margin-bottom: 6px;">
							<strong>1. Zleceniodawca:</strong><br />
							{activeContractor.name}, {activeContractor.address}{activeContractor.nip ? `, NIP: ${activeContractor.nip}` : ''}{activeContractor.krs ? `, KRS: ${activeContractor.krs}` : ''}.
						</div>
						<div>
							<strong>2. Polecający (Zleceniobiorca):</strong><br />
							[Imię i Nazwisko / Full Name]<br />
							Rozliczenie: Przelew bankowy / Gotówka
						</div>
					</div>

					<!-- Right Column: English Parties -->
					<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; box-sizing: border-box; font-size: 11px;">
						<div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
							PARTIES TO THE AGREEMENT:
						</div>
						<div style="margin-bottom: 6px;">
							<strong>1. Principal:</strong><br />
							{activeContractor.name}, {activeContractor.address}{activeContractor.nip ? `, Tax ID (NIP): ${activeContractor.nip}` : ''}{activeContractor.krs ? `, Reg. (KRS): ${activeContractor.krs}` : ''}.
						</div>
						<div>
							<strong>2. Recommender:</strong><br />
							[Full Name]<br />
							Payout method: Bank Transfer / Cash
						</div>
					</div>
				</div>

				<!-- Contract Body: Paragraphs in Two Bordered Columns -->
				<div style="margin-bottom: 24px;">
					{#each Array(maxParagraphs) as _, i}
						{@const plPara = plParagraphs[i] || ''}
						{@const enPara = enParagraphs[i] || ''}
						{@const plLines = plPara ? plPara.split('\n') : []}
						{@const enLines = enPara ? enPara.split('\n') : []}
						{@const plHeading = plLines[0] || ''}
						{@const plBody = plLines.slice(1).join('\n')}
						{@const enHeading = enLines[0] || ''}
						{@const enBody = enLines.slice(1).join('\n')}

						<div style="display: flex; gap: 12px; margin-bottom: 10px; page-break-inside: avoid;">
							<!-- Left Column: Polish -->
							<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff; box-sizing: border-box; min-width: 0;">
								{#if plPara}
									<div style="font-weight: 700; font-size: 11px; color: #0f172a; margin-bottom: 4px; text-align: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px;">
										§{i + 1}. {plHeading}
									</div>
									{#if plBody.trim()}
										<p style="margin: 0; text-align: justify; color: #334155; font-size: 10.5px; line-height: 1.4; white-space: pre-wrap;">
											{plBody}
										</p>
									{/if}
								{:else}
									<div style="color: #94a3b8; font-size: 10px; text-align: center; font-style: italic;">
										—
									</div>
								{/if}
							</div>

							<!-- Right Column: English -->
							<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff; box-sizing: border-box; min-width: 0;">
								{#if enPara}
									<div style="font-weight: 700; font-size: 11px; color: #0f172a; margin-bottom: 4px; text-align: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px;">
										§{i + 1}. {enHeading}
									</div>
									{#if enBody.trim()}
										<p style="margin: 0; text-align: justify; color: #334155; font-size: 10.5px; line-height: 1.4; white-space: pre-wrap;">
											{enBody}
										</p>
									{/if}
								{:else}
									<div style="color: #94a3b8; font-size: 10px; text-align: center; font-style: italic;">
										—
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Signature Section with Anchors \s1\ and \s2\ -->
				<!-- Generous vertical spacing for electronic signature stamp -->
				<div style="margin-top: 130px; margin-bottom: 30px; display: flex; justify-content: space-between; page-break-inside: avoid;">
					<!-- Left Signer (Contractor) -->
					<div style="width: 44%; text-align: center; border-top: 1.5px solid #475569; padding-top: 16px; min-height: 100px;">
						<div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
							W imieniu {activeContractor.name} / For {activeContractor.name}
						</div>
						<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
							(podpis elektroniczny / electronic signature)
						</div>
						<!-- Signature Anchor 1: rendered in white text so it blends seamlessly into background -->
						<div style="color: #ffffff; font-size: 8px; line-height: 8px; user-select: none; margin-top: 25px;">
							\s1\
						</div>
					</div>

					<!-- Right Signer (Recommender) -->
					<div style="width: 44%; text-align: center; border-top: 1.5px solid #475569; padding-top: 16px; min-height: 100px;">
						<div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
							Polecający (Zleceniobiorca) / Recommender
						</div>
						<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
							(podpis elektroniczny / electronic signature)
						</div>
						<!-- Signature Anchor 2: rendered in white text so it blends seamlessly into background -->
						<div style="color: #ffffff; font-size: 8px; line-height: 8px; user-select: none; margin-top: 25px;">
							\s2\
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>


</ClosableModal>
