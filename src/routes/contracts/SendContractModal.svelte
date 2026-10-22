<script lang="ts">
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import CustomFormSelect from '$lib/misc/CustomFormSelect.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import type { ContractTemplate } from '$lib/server/db/firebase/recruiterContract.fdb';
	import type { SentEnvelope } from '$lib/server/db/firebase/recruiterEnvelope.fdb';
	import type { Contractor } from '$lib/server/db/firebase/recruiterContractor.fdb';
	import type { Contractee } from '$lib/server/db/firebase/recruiterContractee.fdb';
	import { addToast } from '$lib/toast';
	import dayjs from 'dayjs';

	interface Props {
		isOpen: boolean;
		contract: ContractTemplate | null;
		recruiterOptions: Record<string, string>;
		contractors?: Contractor[];
		contractees?: Contractee[];
		onSent: (sentEnvelope: SentEnvelope) => void;
	}

	let {
		isOpen = $bindable(false),
		contract = null,
		recruiterOptions = {},
		contractors = [],
		contractees = [],
		onSent
	}: Props = $props();

	let selectedContractorId = $state<string>('');
	let contractorEmailOverride = $state<string>('');
	let contractorRepresentativeOverride = $state<string>('');

	function handleContractorChange(newId: string) {
		selectedContractorId = newId;
		const found = contractors.find((c) => String(c.id) === String(newId));
		const target = found || contractors.find((c) => c.isDefault) || contractors[0];
		if (target) {
			contractorEmailOverride = target.email || 'biuro@eisg.pl';
			contractorRepresentativeOverride = target.representative || '';
		}
	}

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
			representative: 'Zarząd Spółki',
			email: 'biuro@eisg.pl',
			phone: '+48 22 123 45 67'
		};
	});

	// Form State
	let selectedContracteeId = $state<string>('');
	let receiverName = $state('');
	let receiverPhone = $state('');
	let receiverEmail = $state('');
	let deliveryMethod = $state<'email' | 'SMS'>('email');
	let paymentMethod = $state<'bank' | 'cash'>('bank');
	let bankAccount = $state('');
	let selectedRecruiterId = $state<string>('none');
	let newRecruiterName = $state('');

	let isSubmitting = $state(false);
	let isGeneratingPreview = $state(false);
	let pdfContainerEl = $state<HTMLDivElement | null>(null);

	// Computed recruiter list for CustomFormSelect
	const recruiterDropdownList = $derived({
		none: 'No assigned recruiter',
		create_new: '+ Create new recruiter in Bitrix list',
		...recruiterOptions
	});

	$effect(() => {
		if (isOpen && contract) {
			selectedContracteeId = '';
			receiverName = '';
			receiverPhone = '';
			receiverEmail = '';
			deliveryMethod = 'email';
			paymentMethod = 'bank';
			bankAccount = '';
			selectedRecruiterId = 'none';
			newRecruiterName = '';

			const defaultC = contractors.find((c) => c.isDefault) || contractors[0];
			selectedContractorId = defaultC?.id || '';
			contractorEmailOverride = defaultC?.email || 'biuro@eisg.pl';
			contractorRepresentativeOverride = defaultC?.representative || '';
		}
	});

	// Auto-adjust deliveryMethod when email or phone changes
	$effect(() => {
		if (!receiverEmail.trim() && receiverPhone.trim()) {
			deliveryMethod = 'SMS';
		}
	});

	// Paragraph breakdown
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

	const activeContractText = $derived(
		`--- POLISH VERSION / WERSJA POLSKA ---\n\n${contract?.plText || ''}\n\n--- ENGLISH VERSION / WERSJA ANGIELSKA ---\n\n${contract?.enText || ''}`
	);

	const todayFormatted = $derived(dayjs().format('DD.MM.YYYY'));

	function handleContracteeSelect(contracteeId: string) {
		selectedContracteeId = contracteeId;
		if (!contracteeId) return;

		const c = contractees.find((item) => item.id === contracteeId);
		if (c) {
			receiverName = c.name || '';
			receiverPhone = c.phone || '';
			receiverEmail = c.email || '';
			deliveryMethod = c.deliveryMethod || (c.email ? 'email' : 'SMS');
			paymentMethod = c.paymentMethod || 'bank';
			bankAccount = c.bankAccount || '';
			if (c.recruiterId) {
				selectedRecruiterId = String(c.recruiterId);
			}
			addToast(`Loaded contractee: ${c.name}`, 'info');
		}
	}

	async function generatePdfInstance() {
		if (!pdfContainerEl) throw new Error('PDF element not found in DOM');

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
			windowWidth: 1024,
			onclone: (clonedDoc: Document) => {
				const clonedEl = clonedDoc.getElementById('ContractPdfDocument');
				if (clonedEl) {
					clonedEl.style.display = 'block';
					clonedEl.style.width = '794px';
					clonedEl.style.minWidth = '794px';
					clonedEl.style.maxWidth = '794px';
					clonedEl.style.transform = 'none';
				}
			}
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

		// Calculate exact DocuSign pixel coordinates from actual DOM element position on final page
		// DocuSign standard A4 dimensions: 595.3 x 841.9 pt (pixels at 72 DPI)
		const docuSignPageW = 595.3;
		const docuSignPageH = 841.9;

		// Signature section element
		const sigSectionEl = pdfContainerEl.querySelector('#signature-section') as HTMLElement | null;
		const a1El = pdfContainerEl.querySelector('#anchor-s1') as HTMLElement | null;
		const a2El = pdfContainerEl.querySelector('#anchor-s2') as HTMLElement | null;

		let leftCoords = { x: 80, y: 740 };
		let rightCoords = { x: 340, y: 740 };

		if (sigSectionEl && a1El && a2El) {
			const containerRect = pdfContainerEl.getBoundingClientRect();
			const secRect = sigSectionEl.getBoundingClientRect();
			const a1Rect = a1El.getBoundingClientRect();
			const a2Rect = a2El.getBoundingClientRect();

			// Pixel ratio from HTML DOM width to DocuSign page width (595.3 pt)
			const scale = docuSignPageW / containerRect.width;

			// Total page height in DOM pixels corresponding to 841.9 pt DocuSign page
			const domPageHeight = docuSignPageH / scale;

			// Distance from top of contract document to the signature anchor lines
			const top1Dom = a1Rect.top - containerRect.top;
			const top2Dom = a2Rect.top - containerRect.top;

			// Position on the current (final) page
			const pageY1Dom = top1Dom % domPageHeight;
			const pageY2Dom = top2Dom % domPageHeight;

			// Left distance from container left edge
			const left1Dom = a1Rect.left - containerRect.left;
			const left2Dom = a2Rect.left - containerRect.left;

			// Shift right (+50) to align with column center, and shift up to sit directly above the line.
			leftCoords = {
				x: Math.round(left1Dom * scale + 50),
				y: Math.round(pageY1Dom * scale - 110)
			};

			rightCoords = {
				x: Math.round(left2Dom * scale + 50),
				y: Math.round(pageY2Dom * scale - 110)
			};
		}

		return { doc, leftCoords, rightCoords };
	}

	async function handlePreviewPdf() {
		isGeneratingPreview = true;
		try {
			addToast('Generating PDF preview...', 'info');
			const { doc } = await generatePdfInstance();
			const pdfBlob = doc.output('blob');
			const pdfUrl = URL.createObjectURL(pdfBlob);
			window.open(pdfUrl, '_blank');
			addToast('PDF preview opened in new tab!', 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error generating PDF preview.', 'danger');
		} finally {
			isGeneratingPreview = false;
		}
	}

	async function handleSend() {
		if (!receiverName.trim()) {
			addToast('Please provide recommender full name.', 'info');
			return;
		}

		if (deliveryMethod === 'email' && !receiverEmail.trim()) {
			addToast('Please enter an email address or select SMS delivery.', 'info');
			return;
		}

		if (deliveryMethod === 'SMS' && !receiverPhone.trim()) {
			addToast('Phone number is required for SMS delivery.', 'info');
			return;
		}

		if (paymentMethod === 'bank' && !bankAccount.trim()) {
			addToast('Please enter a bank account number or select Cash.', 'info');
			return;
		}

		if (selectedRecruiterId === 'create_new' && !newRecruiterName.trim() && !receiverName.trim()) {
			addToast('Please specify a name for the new recruiter in Bitrix.', 'warning');
			return;
		}

		isSubmitting = true;
		try {
			addToast('Rendering contract document...', 'info');
			const { doc, leftCoords, rightCoords } = await generatePdfInstance();
			const pdfBase64 = doc.output('datauristring');

			addToast('Dispatching envelope via DocuSign API...', 'info');

			const recruiterName =
				selectedRecruiterId !== 'none'
					? recruiterOptions[selectedRecruiterId] || (selectedRecruiterId === 'create_new' ? (newRecruiterName || receiverName) : '')
					: '';

			const res = await fetch('/contracts/api/envelopes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pdfBase64,
					contractId: contract?.id,
					contractTitle: contract?.title,
					contractorId: activeContractor.id,
					contractorNip: activeContractor.nip,
					contracteeId: selectedContracteeId || undefined,
					plainText: activeContractText,
					receiver: {
						name: receiverName.trim(),
						phone: receiverPhone.trim() || undefined,
						email: receiverEmail.trim() || undefined,
						deliveryMethod
					},
					sender: {
						name: activeContractor.name,
						email: contractorEmailOverride.trim() || activeContractor.email || 'biuro@eisg.pl'
					},
					paymentMethod,
					bankAccount: paymentMethod === 'bank' ? bankAccount.trim() : undefined,
					recruiterId: selectedRecruiterId,
					recruiterName,
					newRecruiterName: newRecruiterName.trim() || receiverName.trim(),
					totalPages: doc.getNumberOfPages(),
					leftCoords,
					rightCoords
				})
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || data.error || 'Error sending contract');
			}

			addToast('Contract sent via DocuSign successfully!', 'success');
			onSent({
				id: data.id,
				envelopeId: data.envelopeId,
				contractId: contract?.id,
				contractTitle: contract?.title || 'Recommendation Agreement',
				contractorId: activeContractor.id,
				contractorNip: activeContractor.nip,
				contracteeId: data.contracteeId || selectedContracteeId || undefined,
				sender: { name: activeContractor.name, email: contractorEmailOverride.trim() || activeContractor.email || 'biuro@eisg.pl' },
				receiver: {
					name: receiverName.trim(),
					phone: receiverPhone.trim(),
					email: receiverEmail.trim(),
					deliveryMethod
				},
				paymentMethod,
				bankAccount: paymentMethod === 'bank' ? bankAccount.trim() : undefined,
				recruiterId: data.recruiterId || (selectedRecruiterId !== 'none' ? selectedRecruiterId : undefined),
				recruiterName: data.recruiterName || recruiterName,
				status: 'sent',
				plainText: activeContractText,
				createdAt: new Date().toISOString()
			});
			isOpen = false;
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'An error occurred while sending the contract.', 'danger');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ClosableModal
	bind:isOpen
	size="xl"
	headerText={`Send Contract: ${contract?.title || ''}`}
>
	<div class="row g-3">
		<!-- Section: Contractor / Principal (Party 1) -->
		<div class="col-12 bg-slate-50 p-3 rounded-3 border border-slate-200">
			<div class="d-flex align-items-center justify-content-between mb-2">
				<span class="text-xs fw-bold text-slate-700 text-uppercase d-flex align-items-center gap-1.5">
					<UIcon name="building" size="6" />
					<span class="ms-2">Party 1: Contractor / Principal Company</span>
				</span>
				<span class="badge bg-primary text-white rounded-pill px-2.5 py-0.5 text-2xs fw-bold">
					NIP: {activeContractor.nip || '-'}
				</span>
			</div>

			<div class="row g-2">
				<!-- Top-Left: Select Contractor -->
				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="contractorSelect">Select Contractor Company:</label>
					<select
						id="contractorSelect"
						class="form-select form-select-sm text-xs border-slate-200 bg-white"
						value={selectedContractorId}
						onchange={(e) => handleContractorChange(e.currentTarget.value)}
					>
						<option value="">-- Use default contractor ({contractors.find((c) => c.isDefault)?.name || contractors[0]?.name || 'EISG'}) --</option>
						{#each contractors as c (c.id)}
							<option value={c.id}>
								{c.name} (NIP: {c.nip}){c.isDefault ? ' [Default]' : ''}
							</option>
						{/each}
					</select>
				</div>

				<!-- Top-Right: Contractor Details -->
				<div class="col-md-6">
					<div class="text-2xs text-secondary bg-white p-2 rounded-3 border border-slate-200 h-100 d-flex flex-column justify-content-center">
						<div><strong>{activeContractor.name}</strong></div>
						<div>{activeContractor.address}</div>
					</div>
				</div>

				<!-- Bottom-Left: Override Representative Name -->
				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="contractorRepInput">Override Representative Name:</label>
					<input
						id="contractorRepInput"
						type="text"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-2 py-1"
						placeholder="e.g. Jan Kowalski (Zarząd)"
						bind:value={contractorRepresentativeOverride}
					/>
				</div>

				<!-- Bottom-Right: Override Email -->
				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="contractorEmailInput">Override Contractor Email:</label>
					<input
						id="contractorEmailInput"
						type="email"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-2 py-1"
						placeholder="contractor@example.com"
						bind:value={contractorEmailOverride}
					/>
				</div>
			</div>
		</div>

		<!-- Section: Party 2: Recommender / Contractee Details -->
		<div class="col-12 bg-slate-50 p-3 rounded-3 border border-slate-200">
			<div class="d-flex align-items-center justify-content-between mb-2">
				<span class="text-xs fw-bold text-slate-700 text-uppercase d-flex align-items-center gap-1.5">
					<UIcon name="user" size="6" />
					<span class="ms-2">Party 2: Recommender / Contractee Details</span>
				</span>
				{#if selectedContracteeId}
					<span class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-0.5 text-2xs fw-bold">
						Contractee Selected
					</span>
				{/if}
			</div>

			<div class="row g-2">
				{#if contractees.length > 0}
					<div class="col-12 mb-2">
						<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="contracteeSelect">Pick from Saved Contractees (Optional):</label>
						<select
							id="contracteeSelect"
							class="form-select form-select-sm text-xs border-slate-200 bg-white"
							value={selectedContracteeId}
							onchange={(e) => handleContracteeSelect(e.currentTarget.value)}
						>
							<option value="">-- Choose saved Contractee or fill manually below --</option>
							{#each contractees as c (c.id)}
								<option value={c.id}>
									{c.name} {c.phone ? `(${c.phone})` : ''} {c.recruiterName ? `[Recruiter: ${c.recruiterName}]` : ''}
								</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="receiverNameInput">
						Recommender Full Name <span class="text-danger">*</span>
					</label>
					<input
						id="receiverNameInput"
						type="text"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-2 py-1"
						placeholder="e.g. John Doe / Ram Kumar"
						bind:value={receiverName}
					/>
				</div>

				<div class="col-md-6">
					<span class="form-label text-2xs fw-bold text-slate-600 mb-0.5 d-block">Assigned Recruiter (Bitrix)</span>
					<CustomFormSelect
						list={recruiterDropdownList}
						bind:value={selectedRecruiterId}
					/>
					{#if selectedRecruiterId === 'create_new'}
						<div class="alert alert-info py-1 px-2.5 mt-1.5 mb-0 text-2xs rounded-3">
							Will create a new recruiter in Bitrix using contractee name: <strong>{receiverName.trim() || '(enter contractee name above)'}</strong>
						</div>
					{/if}
				</div>

				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="receiverPhoneInput">
						Phone Number
						{#if deliveryMethod === 'SMS'}
							<span class="text-danger">* (Required for SMS)</span>
						{/if}
					</label>
					<input
						id="receiverPhoneInput"
						type="tel"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-2 py-1"
						placeholder="+48 500 000 000"
						bind:value={receiverPhone}
					/>
				</div>

				<div class="col-md-6">
					<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="receiverEmailInput">
						Email Address
						{#if deliveryMethod === 'email'}
							<span class="text-danger">* (Required for Email)</span>
						{/if}
					</label>
					<input
						id="receiverEmailInput"
						type="email"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-2 py-1"
						placeholder="recommender@example.com"
						bind:value={receiverEmail}
					/>
				</div>
			</div>
		</div>

		<!-- Delivery Method Selection -->
		<div class="col-md-6">
			<span class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1 d-block">DocuSign Delivery Method <span class="text-danger">*</span></span>
			<div class="d-flex gap-3 mt-1">
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="deliveryMethod"
						id="deliveryEmail"
						value="email"
						bind:group={deliveryMethod}
					/>
					<label class="form-check-label text-xs fw-semibold text-slate-800" for="deliveryEmail">
						<UIcon name="envelope" size="7" class="me-1" />
						Email
					</label>
				</div>
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="deliveryMethod"
						id="deliverySMS"
						value="SMS"
						bind:group={deliveryMethod}
					/>
					<label class="form-check-label text-xs fw-semibold text-slate-800" for="deliverySMS">
						<UIcon name="phone-call" size="7" class="me-1 text-primary" />
						SMS Mobile
						<span class="text-muted text-2xs font-normal">(DocuSign SMS delivery)</span>
					</label>
				</div>
			</div>
			<small class="text-secondary text-2xs d-block mt-1">
				{deliveryMethod === 'SMS'
					? 'DocuSign will send the signing link directly via SMS text message to the phone number.'
					: 'The signing link will be sent to the recipient email address.'}
			</small>
		</div>

		<!-- Payment Details -->
		<div class="col-md-6">
			<span class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1 d-block">Recommendation Payout Method <span class="text-danger">*</span></span>
			<div class="d-flex gap-3 mt-1">
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="paymentMethod"
						id="payBank"
						value="bank"
						bind:group={paymentMethod}
					/>
					<label class="form-check-label text-xs fw-semibold text-slate-800" for="payBank">
						<UIcon name="bank" size="7" class="me-1" />
						Bank Transfer
					</label>
				</div>
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="paymentMethod"
						id="payCash"
						value="cash"
						bind:group={paymentMethod}
					/>
					<label class="form-check-label text-xs fw-semibold text-slate-800" for="payCash">
						<UIcon name="money" size="7" class="me-1 text-success" />
						Cash ("Gotówka")
					</label>
				</div>
			</div>

			{#if paymentMethod === 'bank'}
				<div class="mt-2">
					<input
						type="text"
						class="form-control form-control-sm text-xs border-slate-200 rounded-3 px-3 font-monospace"
						placeholder="Bank account number (IBAN / 26 digits)"
						bind:value={bankAccount}
					/>
				</div>
			{:else}
				<div class="alert alert-info py-1 px-2.5 mt-2 mb-0 text-2xs rounded-3">
					Cash payout at the office selected.
				</div>
			{/if}
		</div>
	</div>

	<!-- HIDDEN / OFF-SCREEN PDF DOCUMENT CONTAINER FOR HTML2CANVAS & JSPDF -->
	<!-- BILINGUAL: TWO BORDERED COLUMNS SIDE-BY-SIDE -->
	<div
		style="position: absolute; left: -9999px; top: -9999px; width: 794px; background: #ffffff; color: #111111; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.45; padding: 36px;"
		id="ContractPdfDocument"
		bind:this={pdfContainerEl}
	>
		<!-- Header Date -->
		<div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 20px;">
			<div style="font-size: 11px; color: #555555;">
				Warszawa / Warsaw, Data / Date: {todayFormatted}
			</div>
		</div>

		<!-- Title Banner -->
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
					<strong>{receiverName.trim() || '[Imię i Nazwisko / Full Name]'}</strong><br />
					Rozliczenie: {paymentMethod === 'bank' ? `Przelew bankowy (${bankAccount || 'Konto nie podane'})` : 'Gotówka ("Gotówka")'}
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
					<strong>{receiverName.trim() || '[Full Name]'}</strong><br />
					Payout method: {paymentMethod === 'bank' ? `Bank Transfer (${bankAccount || 'Account not provided'})` : 'Cash ("Gotówka")'}
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
		<div id="signature-section" style="margin-top: 130px; margin-bottom: 30px; display: flex; justify-content: space-between; page-break-inside: avoid;">
			<!-- Left Signer (Contractor) -->
			<div style="width: 44%; text-align: center; border-top: 1.5px solid #475569; padding-top: 16px; min-height: 100px;">
				<div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
					W imieniu {activeContractor.name} / For {activeContractor.name}
				</div>
				<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
					(podpis elektroniczny / electronic signature)
				</div>
				<!-- Signature Anchor 1: rendered in white text so it blends seamlessly into background -->
				<div id="anchor-s1" style="color: #ffffff; font-size: 8px; line-height: 8px; user-select: none; margin-top: 25px;">
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
				<div id="anchor-s2" style="color: #ffffff; font-size: 8px; line-height: 8px; user-select: none; margin-top: 25px;">
					\s2\
				</div>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="btn btn-outline-secondary btn-sm px-3 shadow-xs d-inline-flex align-items-center gap-1.5"
			onclick={handlePreviewPdf}
			disabled={isGeneratingPreview || isSubmitting}
		>
			{#if isGeneratingPreview}
				<span class="spinner-border spinner-border-sm" role="status"></span>
				<span>Rendering...</span>
			{:else}
				<UIcon name="eye" size="6" />
				<span>Preview PDF</span>
			{/if}
		</button>

		<button
			type="button"
			class="btn btn-primary btn-sm px-4 fw-semibold shadow-xs d-inline-flex align-items-center gap-1.5"
			onclick={handleSend}
			disabled={isSubmitting || isGeneratingPreview}
		>
			{#if isSubmitting}
				<span class="spinner-border spinner-border-sm" role="status"></span>
				<span>Dispatching to DocuSign...</span>
			{:else}
				<UIcon name="paper-plane" size="6" />
				<span>Send Contract</span>
			{/if}
		</button>
	{/snippet}
</ClosableModal>
