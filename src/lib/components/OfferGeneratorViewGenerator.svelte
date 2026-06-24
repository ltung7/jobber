<script lang="ts">
	import { addToast } from '$lib/toast';
	import axios from 'axios';
	import { writable } from 'svelte/store';
	import { CONTRACT_OPTIONS, SHIFT_OPTIONS, LANGUAGES } from './const';
	import CustomFormSelect from '$lib/misc/CustomFormSelect.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		doSave: (d: JobFormData) => void;
		openPreviewForm: (form: JobFormData) => void;
	}

	const { doSave, openPreviewForm }: Props = $props();

	let translating = $state(false);

	function createFormStore() {
		const initial: JobFormData = {
			jobType: '',
			location: '',
			availableFrom: new Date().toISOString().slice(0, 10),
			housing: '',
			rate: '',
			contract: '',
			shifts: '',
			benefits: '',
			workplaceDesc: '',
			requirements: '',
			duties: '',
			extra: '',
			recruiterName: '',
			recruiterPhone: '',
			recruiterEmail: '',
			offerRef: '',
			sheetsUrl: '',
			langExtra: 'en'
		};
		const { subscribe, set, update } = writable<JobFormData>(initial);
		return {
			subscribe,
			set,
			update,
			reset: () => set({ ...initial, availableFrom: new Date().toISOString().slice(0, 10) })
		};
	}

	const form = createFormStore();

	async function translateForm(targetLang: 'en' | 'pl') {
		const fields = {
			workplaceDesc: $form.workplaceDesc,
			requirements: $form.requirements,
			duties: $form.duties,
			extra: $form.extra,
			jobType: $form.jobType,
			location: $form.location,
			housing: $form.housing,
			benefits: $form.benefits
		};

		if (!Object.values(fields).some((v) => v.length > 0)) {
			addToast('Formularz jest pusty — najpierw uzupełnij treść.', 'info');
			return;
		}

		const langName = targetLang === 'en' ? 'angielski' : 'polski';
		translating = true;

		try {
			const { data } = await axios.post<{ translated: typeof fields }>('/translate', {
				fields,
				targetLang
			});

			const { translated } = data;

			form.update((f) => ({
				...f,
				jobType: translated.jobType ?? f.jobType,
				location: translated.location ?? f.location,
				housing: translated.housing ?? f.housing,
				benefits: translated.benefits ?? f.benefits,
				workplaceDesc: translated.workplaceDesc ?? f.workplaceDesc,
				requirements: translated.requirements ?? f.requirements,
				duties: translated.duties ?? f.duties,
				extra: translated.extra ?? f.extra
			}));

			addToast('Przetłumaczono na ' + langName + '!', 'success');
		} catch (e) {
			if (axios.isAxiosError(e)) {
				const msg = e.response?.data?.message ?? 'Błąd tłumaczenia — sprawdź połączenie.';
				addToast(msg, 'error');
			} else {
				addToast('Nieoczekiwany błąd tłumaczenia.', 'error');
			}
			console.error('[translateForm]', e);
		} finally {
			translating = false;
		}
	}

	function validate(d: JobFormData): boolean {
		if (!d.jobType) {
			addToast('Uzupełnij pole: Rodzaj pracy');
			return false;
		}
		if (!d.location) {
			addToast('Uzupełnij pole: Miejsce pracy');
			return false;
		}
		if (!d.rate) {
			addToast('Uzupełnij pole: Stawka godzinowa');
			return false;
		}
		if (!d.requirements) {
			addToast('Uzupełnij pole: Wymagania');
			return false;
		}
		return true;
	}

	function saveOffer() {
		if (!validate($form)) return;
		doSave({ ...$form });
	}

	function openPreview() {
		if (!validate($form)) return;
		openPreviewForm($form);
	}
</script>

<div class="page-header mb-4">
	<h1 class="fs-5 fw-semibold mb-1">Nowa oferta pracy</h1>
	<p class="text-muted" style="font-size:13px;">Uzupełnij formularz — wybierz język PDF i wygeneruj ofertę.</p>
</div>

<!-- Lang selector -->
<div class="lang-row">
	<span class="lang-row-label">Język PDF</span>
	<CustomFormSelect list={LANGUAGES} bind:value={$form.langExtra} />
	<span class="lang-note">1 oferta = 1 język = 1 PDF. Komunikator zawsze w EN.</span>
</div>

<!-- Stanowisko -->
<div class="form-card">
	<div class="form-card-title">Stanowisko i lokalizacja</div>
	<div class="row g-3">
		<div class="col-md-6">
			<label class="field-label" for="job-type">Rodzaj pracy <span class="req">*</span></label>
			<input id="job-type" type="text" class="form-control" placeholder="np. Operator wózka widłowego" bind:value={$form.jobType} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-location">Miejsce pracy <span class="req">*</span></label>
			<input id="job-location" type="text" class="form-control" placeholder="np. Poznań, ul. Przemysłowa 12" bind:value={$form.location} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-available">Dostępne od <span class="req">*</span></label>
			<input id="job-available" type="date" class="form-control" bind:value={$form.availableFrom} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-housing">Zakwaterowanie</label>
			<input id="job-housing" type="text" class="form-control" placeholder="np. 2 km od zakładu, zapewnione" bind:value={$form.housing} />
		</div>
	</div>
</div>

<!-- Warunki -->
<div class="form-card">
	<div class="form-card-title">Warunki zatrudnienia</div>
	<div class="row g-3">
		<div class="col-md-6">
			<label class="field-label" for="job-rate">Stawka godzinowa <span class="req">*</span></label>
			<input id="job-rate" type="text" class="form-control" placeholder="np. 28–32 PLN/h brutto" bind:value={$form.rate} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-contract">Rodzaj umowy</label>
			<select id="job-contract" class="form-select" bind:value={$form.contract}>
				<option value="">— wybierz —</option>
				{#each CONTRACT_OPTIONS as opt}<option>{opt}</option>{/each}
			</select>
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-shifts">Zmianowość</label>
			<select id="job-shifts" class="form-select" bind:value={$form.shifts}>
				<option value="">— wybierz —</option>
				{#each SHIFT_OPTIONS as opt}<option>{opt}</option>{/each}
			</select>
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-benefits">Dodatkowe benefity</label>
			<input id="job-benefits" type="text" class="form-control" placeholder="np. transport, ubezpieczenie" bind:value={$form.benefits} />
		</div>
	</div>
</div>

<!-- Opis stanowiska -->
<div class="form-card">
	<div class="form-card-title">Opis stanowiska</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="job-wdesc">Opis miejsca pracy</label>
			<textarea id="job-wdesc" class="form-control" rows="3" placeholder="np. Nowoczesny magazyn wysokiego składowania..." bind:value={$form.workplaceDesc}></textarea>
		</div>
		<div class="col-12">
			<label class="field-label" for="job-req">Wymagania <span class="req">*</span></label>
			<textarea id="job-req" class="form-control" rows="3" placeholder="np. Doświadczenie min. 1 rok, uprawnienia UDT" bind:value={$form.requirements}></textarea>
		</div>
		<div class="col-12">
			<label class="field-label" for="job-duties">Obowiązki</label>
			<textarea id="job-duties" class="form-control" rows="3" placeholder="np. Obsługa linii produkcyjnej, kompletacja zamówień" bind:value={$form.duties}></textarea>
		</div>
		<div class="col-12">
			<label class="field-label" for="job-extra">Dodatkowe informacje</label>
			<textarea id="job-extra" class="form-control" rows="2" placeholder="np. Możliwa relokacja z rodziną" bind:value={$form.extra}></textarea>
		</div>
	</div>
	<!-- Translate row -->
	<div class="d-flex align-items-center gap-2 flex-wrap mt-3 pt-3" style="border-top:1px solid #d8e4e4;">
		<span style="font-size:11px;font-weight:700;color:#8fa0ae;text-transform:uppercase;letter-spacing:0.05em;">Tłumacz treść przez AI:</span>
		<button class="btn btn-eisg-ghost btn-sm" onclick={() => translateForm('en')} disabled={translating}>
			<UIcon name="translate" />
			Generuj EN
		</button>
		<button class="btn btn-eisg-ghost btn-sm" onclick={() => translateForm('pl')} disabled={translating}>
			<UIcon name="translate" />
			Generuj PL
		</button>
		{#if translating}
			<span class="spinner-border spinner-border-sm text-primary" style="width: 16px; height: 16px;" role="status" aria-hidden="true"></span>
		{/if}
		<span style="font-size:11px;color:#8fa0ae;">Tłumaczy: opis, wymagania, obowiązki, info</span>
	</div>
</div>

<!-- Kontakt -->
<div class="form-card">
	<div class="form-card-title">Dane kontaktowe</div>
	<div class="row g-3">
		<div class="col-md-6">
			<label class="field-label" for="rec-name">Imię i nazwisko rekrutera</label>
			<input id="rec-name" type="text" class="form-control" placeholder="np. Anna Kowalska" bind:value={$form.recruiterName} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="rec-phone">Telefon / WhatsApp</label>
			<input id="rec-phone" type="text" class="form-control" placeholder="np. +48 500 123 456" bind:value={$form.recruiterPhone} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="rec-email">E-mail</label>
			<input id="rec-email" type="text" class="form-control" placeholder="np. rekrutacja@eisg.pl" bind:value={$form.recruiterEmail} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="offer-ref">Nr referencyjny oferty</label>
			<input id="offer-ref" type="text" class="form-control" placeholder="np. EISG/2026/001" bind:value={$form.offerRef} />
		</div>
		<div class="col-12">
			<label class="field-label" for="sheets-url">Link Google Sheets (kandydaci)</label>
			<input id="sheets-url" type="url" class="form-control" placeholder="https://docs.google.com/spreadsheets/d/..." bind:value={$form.sheetsUrl} />
			<div class="hint">Opcjonalnie — link do arkusza kandydatów dla tej oferty.</div>
		</div>
	</div>
</div>

<!-- Actions -->
<div class="d-flex gap-2 justify-content-end mt-2 mb-4">
	<button class="btn btn-eisg-ghost" onclick={() => form.reset()}>
		<UIcon name="rotate-left" />
		Wyczyść
	</button>
	<button class="btn btn-eisg-success" onclick={saveOffer}>
		<UIcon name="disk" />
		Zapisz ofertę
	</button>
	<button class="btn btn-eisg-primary" onclick={openPreview}>
		<UIcon name="eye" />
		Podgląd / Generuj
	</button>
</div>
