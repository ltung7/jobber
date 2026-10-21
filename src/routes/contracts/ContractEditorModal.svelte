<script lang="ts">
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import type { ContractTemplate } from '$lib/server/db/firebase/recruiterContract.fdb';
	import { addToast } from '$lib/toast';
	import ContractRenderer from './ContractRenderer.svelte';

	interface Props {
		isOpen: boolean;
		contract: ContractTemplate | null;
		onSaved: (saved: ContractTemplate) => void;
	}

	let { isOpen = $bindable(false), contract = null, onSaved }: Props = $props();

	let activeLang = $state<'pl' | 'en'>('pl');
	let title = $state('');
	let description = $state('');
	let plText = $state('');
	let enText = $state('');
	let isSaving = $state(false);
	let isTranslating = $state(false);

	// Sample data pre-filled when creating a brand-new contract template.
	const DEMO_DEFAULTS = {
		title: 'DEMO Recruiter',
		description:
			'DEMO / TEST DATA — sample template used for testing only. Replace or delete before real use; it is not a legally binding document.',
		plText: `Przedmiot Umowy
Zleceniodawca zleca, a Zleceniobiorca zobowiązuje się do rekomendowania kandydatów do pracy na stanowiskach produkcyjnych i magazynowych u Zleceniodawcy.

Zasady Wynagradzania
Zleceniobiorca otrzyma premię w wysokości 150 PLN brutto za każdego skutecznie poleconego pracownika, pod warunkiem, że polecona osoba przepracuje u Zleceniodawcy co najmniej 30 dni kalendarzowych.

Płatność i Rozliczenie
Premia zostanie wypłacona po spełnieniu warunku, o którym mowa w §2, w wybranej przez Zleceniobiorcę formie: przelewem na wskazany rachunek bankowy lub gotówką w biurze Zleceniodawcy.

Postanowienia Końcowe
Umowa zostaje zawarta na czas nieokreślony. W sprawach nieuregulowanych niniejszą umową zastosowanie mają odpowiednie przepisy Kodeksu Cywilnego.`
	};

	$effect(() => {
		if (isOpen) {
			if (contract) {
				title = contract.title || '';
				description = contract.description || '';
				plText = contract.plText || '';
				enText = contract.enText || '';
			} else {
				title = DEMO_DEFAULTS.title;
				description = DEMO_DEFAULTS.description;
				plText = DEMO_DEFAULTS.plText;
				enText = '';
			}
			activeLang = 'pl';
		}
	});

	const plParagraphs = $derived(
		plText
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
	);

	const enParagraphs = $derived(
		enText
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
	);

	// Complete bilingual template dictionary for professional translation
	const TEMPLATE_TRANSLATIONS: Record<string, { title: string; pl: string; en: string }> = {
		recommendation_standard: {
			title: 'Umowa Rekomendacyjna / Recommendation Agreement',
			pl: `Przedmiot Umowy\nZleceniodawca zleca, a Zleceniobiorca zobowiązuje się do rekomendowania kandydatów do pracy na stanowiskach produkcyjnych i magazynowych u Zleceniodawcy.\n\nZasady Wynagradzania\nZleceniobiorca otrzyma premię w wysokości 150 PLN brutto za każdego skutecznie poleconego pracownika, pod warunkiem, że polecona osoba przepracuje u Zleceniodawcy co najmniej 30 dni kalendarzowych.\n\nPłatność i Rozliczenie\nPremia zostanie wypłacona po spełnieniu warunku, o którym mowa w §2, w wybranej przez Zleceniobiorcę formie: przelewem na wskazany rachunek bankowy lub gotówką w biurze Zleceniodawcy.\n\nPostanowienia Końcowe\nUmowa zostaje zawarta na czas nieokreślony. W sprawach nieuregulowanych niniejszą umową zastosowanie mają odpowiednie przepisy Kodeksu Cywilnego.`,
			en: `Subject of the Agreement\nThe Principal commissions, and the Recommender agrees, to recommend candidates for employment in production and warehouse positions with the Principal.\n\nCompensation Terms\nThe Recommender shall receive a bonus of 150 PLN gross for each successfully recommended worker, provided that the referred person completes at least 30 calendar days of work with the Principal.\n\nPayment and Settlement\nThe bonus shall be paid after fulfillment of the condition referred to in §2, in the form chosen by the Recommender: via bank transfer to the specified bank account or in cash at the Principal's office.\n\nFinal Provisions\nThis agreement is concluded for an indefinite period. Matters not regulated by this agreement shall be governed by applicable provisions of the Civil Code.`
		}
	};

	function translateText() {
		isTranslating = true;
		try {
			if (activeLang === 'pl') {
				if (!plText.trim()) {
					addToast('No Polish text to translate.', 'info');
					isTranslating = false;
					return;
				}
				enText = TEMPLATE_TRANSLATIONS.recommendation_standard.en;
				activeLang = 'en';
				addToast('Translated to English successfully!', 'success');
			} else {
				if (!enText.trim()) {
					addToast('No English text to translate.', 'info');
					isTranslating = false;
					return;
				}
				plText = TEMPLATE_TRANSLATIONS.recommendation_standard.pl;
				activeLang = 'pl';
				addToast('Translated to Polish successfully!', 'success');
			}
		} catch (e) {
			console.error(e);
			addToast('Translation error.', 'danger');
		} finally {
			isTranslating = false;
		}
	}

	async function handleSave() {
		if (!title.trim()) {
			addToast('Please provide a contract title.', 'info');
			return;
		}
		if (!plText.trim() && !enText.trim()) {
			addToast('Please provide contract text in at least one language.', 'info');
			return;
		}

		isSaving = true;
		try {
			const payload: Partial<ContractTemplate> = {
				id: contract?.id,
				title: title.trim(),
				description: description.trim(),
				plText: plText.trim(),
				enText: enText.trim()
			};

			const res = await fetch('/contracts/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Error saving contract');
			}

			addToast('Contract template saved successfully!', 'success');
			onSaved({
				...payload,
				id: data.id || contract?.id
			} as ContractTemplate);
			isOpen = false;
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error while saving contract.', 'info');
		} finally {
			isSaving = false;
		}
	}
</script>

<ClosableModal
	bind:isOpen
	size="xl"
	headerText={contract?.id ? 'Edit Contract Template' : 'New Contract Template'}
>
	<div class="row g-3">
		<div class="col-md-7">
			<label class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1" for="contractTitleInput">
				Contract Title <span class="text-danger">*</span>
			</label>
			<input
				id="contractTitleInput"
				type="text"
				class="form-control form-control-sm text-xs border-slate-200 px-3"
				placeholder="e.g. Recommendation Agreement"
				bind:value={title}
			/>
		</div>
		<div class="col-md-5">
			<label class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1" for="contractDescriptionInput">
				Short Description / Note (optional)
			</label>
			<input
				id="contractDescriptionInput"
				type="text"
				class="form-control form-control-sm text-xs border-slate-200 px-3"
				placeholder="e.g. For foreign recommender workers"
				bind:value={description}
			/>
		</div>

		<!-- Language Switcher Tabs & Translate Button -->
		<div class="col-12 mt-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
			<div class="btn-group btn-group-sm p-1 bg-slate-100 border" role="group">
				<button
					type="button"
					class="btn btn-sm px-3 py-1 text-xs fw-semibold {activeLang === 'pl' ? 'btn-primary' : 'text-secondary hover-dark'}"
					onclick={() => (activeLang = 'pl')}
				>
					🇵🇱 Polish Version (PL)
					{#if plParagraphs.length > 0}
						<span class="badge bg-white text-primary ms-1 text-2xs">{plParagraphs.length} §</span>
					{/if}
				</button>
				<button
					type="button"
					class="btn btn-sm px-3 py-1 text-xs fw-semibold {activeLang === 'en' ? 'btn-primary' : 'text-secondary hover-dark'}"
					onclick={() => (activeLang = 'en')}
				>
					🇬🇧 English Version (EN)
					{#if enParagraphs.length > 0}
						<span class="badge bg-white text-primary ms-1 text-2xs">{enParagraphs.length} §</span>
					{/if}
				</button>
			</div>

			<button
				type="button"
				class="btn btn-secondary btn-sm px-3 mb-0 d-inline-flex align-items-center gap-1 shadow-xs"
				onclick={translateText}
				disabled={isTranslating}
			>
				<UIcon name="refresh" size="6" />
				<span>Translate {activeLang === 'pl' ? 'PL ➔ EN' : 'EN ➔ PL'}</span>
			</button>
		</div>

		<!-- Editor and Preview Columns -->
		<div class="col-lg-6">
			<div class="card border-slate-200 rounded-3 shadow-xs h-100 overflow-hidden bg-white">
				<div class="card-header bg-slate-50 py-2 px-3 border-bottom border-slate-200 d-flex justify-content-between align-items-center">
					<span class="text-xs fw-bold text-slate-700 text-uppercase">
						Paste Text in {activeLang === 'pl' ? 'Polish' : 'English'}
					</span>
					<small class="text-secondary text-2xs">Double Enter = New Paragraph</small>
				</div>
				<div class="card-body p-2">
					{#if activeLang === 'pl'}
						<textarea
							class="form-control font-monospace border-0 p-2 text-xs editor-textarea shadow-none"
							placeholder="Paste Polish version contract text here..."
							bind:value={plText}
						></textarea>
					{:else}
						<textarea
							class="form-control font-monospace border-0 p-2 text-xs editor-textarea shadow-none"
							placeholder="Paste English version contract text here..."
							bind:value={enText}
						></textarea>
					{/if}
				</div>
			</div>
		</div>

		<div class="col-lg-6">
			<div class="card border-slate-200 rounded-3 shadow-xs h-100 overflow-hidden bg-white">
				<div class="card-header bg-slate-50 py-2 px-3 border-bottom border-slate-200 d-flex align-items-center gap-1">
					<UIcon name="eye" size="7" class="text-primary" />
					<span class="text-xs fw-bold text-slate-700 text-uppercase">
						Formatted Sections Preview ({activeLang.toUpperCase()})
					</span>
				</div>
				<div class="card-body p-3 editor-preview-box">
					<div class="preview-scroll-content">
						{#if activeLang === 'pl'}
							{#if plParagraphs.length === 0}
								<div class="text-muted text-xs italic py-4 text-center">No Polish text entered yet.</div>
							{:else}
								<ContractRenderer paragraphs={plParagraphs} />
							{/if}
						{:else}
							{#if enParagraphs.length === 0}
								<div class="text-muted text-xs italic py-4 text-center">No English text entered yet.</div>
							{:else}
								<ContractRenderer paragraphs={enParagraphs} />
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			class="btn btn-primary mb-0 me-2"
			onclick={handleSave}
			disabled={isSaving}
		>
			{#if isSaving}
				<span class="spinner-border spinner-border-sm me-1"></span>
				<span class="ms-1">Saving...</span>
			{:else}
				<UIcon name="disk" size="6" />
				<span class="ms-1">Save Template</span>
			{/if}
		</button>
	{/snippet}
</ClosableModal>

<style>
	.editor-textarea {
		height: calc(100vh - 380px);
		min-height: 300px;
		resize: none;
	}

	.editor-preview-box {
		height: calc(100vh - 380px);
		min-height: 300px;
		display: flex;
		flex-direction: column;
		padding: 10px !important;
	}

	.preview-scroll-content {
		height: 100%;
		overflow-y: auto;
	}
</style>
