<script lang="ts">
	import { addToast } from '$lib/toast';
	import axios from 'axios';
	import { writable } from 'svelte/store';
	import { CONTRACT_OPTION_LIST, SHIFT_OPTION_LIST, LANGUAGES, ACCOMMODATION_OPTION_LIST, BENEFITS_LIST, TRANSLATE_LANGS } from './const';
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		doSave: (d: JobFormData) => void;
		openPreviewForm: (form: JobFormData) => void;
	}

	const { doSave, openPreviewForm }: Props = $props();

	let translating = $state(false);
	let currentLang: false | Lang = $state(false);

	function createFormStore() {
		const initial: JobFormData = {
			jobType: '',
			location: '',
			city: '',
			availableFrom: new Date().toISOString().slice(0, 10),
			accommodation: '',
			rateFrom: 0,
			rateTo: 0,
			rateNet: true,
			contractType: 'uoz',
			shift: 'one',
			benefits: [],
			workplaceDesc: '',
			requirements: '',
			duties: '',
			extra: '',
			offerRef: '',
			lang: {}
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
	let hasTranslations: Array<Lang> = $derived(Object.keys($form.lang) as Lang[]);

	async function translateForm() {
		const fields: TranslatableJobInfo = {
			workplaceDesc: $form.workplaceDesc,
			requirements: $form.requirements,
			duties: $form.duties,
			extra: $form.extra,
			jobType: $form.jobType
		};

		if (!Object.values(fields).some((v) => v.length > 0)) {
			addToast('Formularz jest pusty — najpierw uzupełnij treść.', 'info');
			return;
		}

		translating = true;

		try {
			type Translated = Record<string, Partial<TranslatableJobInfo>>;
			const { data } = await axios.post<{ translated: Translated }>('/translate', {
				fields,
				targetLangs: TRANSLATE_LANGS
			});

			const { translated } = data;

			form.update((f) => ({
				...f,
				lang: translated
			}));

			addToast('Przetłumaczono!', 'success');
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
		if (!d.rateTo) {
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

	// const TEST_DATA: Partial<JobFormData> = {
	// 	workplaceDesc: 'Apex Logistics operates a high-volume distribution center focused on regional retail fulfillment. The facility is clean, climate-controlled, and safety-focused. The workplace emphasizes steady team communication, reliable attendance, and active hands-on labor in a supportive crew environment.',
	// 	requirements: 'Unload incoming freight, inspect packages for damage, and sort inventory into assigned storage bins.\nPick, pack, and label customer orders accurately using hand-held barcode scanners.\nOperate manual pallet jacks, hand trucks, and wrapping equipment to move goods safely across the floor.\nMaintain a clean, hazard-free workspace by sweeping aisles, disposing of trash, and stacking empty pallets.\nAssist with routine stock counts and report inventory discrepancies to shift supervisors.',
	// 	duties: 'Ability to lift, carry, and maneuver items up to 50 lbs repeatedly throughout an 8-hour shift.\nComfort standing, walking, bending, and reaching for extended periods.\nHigh school diploma or GED equivalent.\nReliable transportation and punctual attendance.\nBasic reading, writing, and math skills to verify shipping manifests.',
	// 	extra: 'Selection Process: On-site walk-through interview → basic lifting/safety assessment → background check.',
	// 	jobType: 'Warehouse Associate (TEST)',
	// 	accommodation: 'free',
	// 	benefits: ['clothing', 'training', 'transport', 'legalization'],
	// 	location: 'Faraway 12',
	// 	city: 'Poznań',
	// 	rateFrom: 30,
	// 	rateTo: 35
	// };
</script>

<div class="page-header mb-4">
	<h1 class="fs-5 fw-semibold mb-1">New Job Offer</h1>
	<p class="text-muted" style="font-size:13px;">Fill out the form — select the PDF language and generate the offer.</p>
</div>

<!-- Lang selector -->
<div class="lang-row position-sticky top-0">
	<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={!currentLang} onclick={() => currentLang = false}>
		{@html LANGUAGES.en}
	</button>
	{#if hasTranslations.length}
		{#each hasTranslations as lang}
			<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={lang === currentLang} onclick={() => currentLang = lang}>
				{@html LANGUAGES[lang]}
			</button>
		{/each}
	{/if}
</div>

<!-- Stanowisko -->
<div class="form-card">
	<div class="form-card-title">Position & Location</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="job-type">Job Title <span class="req">*</span></label>
			{#if currentLang}
				<input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" value={$form.lang[currentLang]?.jobType ?? ""} readonly />
			{:else}
				<input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" bind:value={$form.jobType} />
			{/if}
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-location">Address of workplace<span class="req">*</span></label>
			<input id="job-location" type="text" class="form-control" placeholder="e.g. 12 Przemysłowa St." bind:value={$form.location} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-location">City<span class="req">*</span></label>
			<input id="job-location" type="text" class="form-control" placeholder="e.g. Poznań" bind:value={$form.city} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-available">Available from <span class="req">*</span></label>
			<input id="job-available" type="date" class="form-control" bind:value={$form.availableFrom} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-housing">Accommodation</label>
			<select id="job-housing" class="form-select" bind:value={$form.accommodation}>
				{#each Object.entries(ACCOMMODATION_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
	</div>
</div>

<!-- Warunki -->
<div class="form-card">
	<div class="form-card-title">Employment Terms</div>
	<div class="row g-3">
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-rateTo">Hourly Rate <span class="req">*</span></label>
			<div class="d-flex align-items-center">
				<span class="text-muted small me-2">from</span>
				<input id="job-rateFrom" type="number" class="form-control" bind:value={$form.rateFrom} />
				<span class="text-muted small mx-2">to</span>
				<input id="job-rateTo" type="number" class="form-control" bind:value={$form.rateTo} />
				<input id="job-rateNet" type="checkbox" class="ms-3 me-1" bind:checked={$form.rateNet} />
				<label class="field-label mb-0 text-normal mx-0" for="job-rateNet">net</label>
			</div>
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="offerRef">Reference No.</label>
			<input id="offerRef" type="text" class="form-control" bind:value={$form.offerRef} />
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-contract">Contract Type</label>
			<select id="job-contract" class="form-select" bind:value={$form.contractType}>
				<option value="">— select —</option>
				{#each Object.entries(CONTRACT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-shifts">Shift System</label>
			<select id="job-shifts" class="form-select" bind:value={$form.shift}>
				<option value="">— select —</option>
				{#each Object.entries(SHIFT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
		<div class="col-12">
			<label class="field-label" for="job-benefits">Additional Benefits</label>
			<fieldset class="benefits-container">
				{#each Object.entries(BENEFITS_LIST) as [value, caption]}
					<label class="checkbox-item small d-block">
						<input type="checkbox" {value} bind:group={$form.benefits} />
						<span>{caption}</span>
					</label>
				{/each}
			</fieldset>
		</div>
	</div>
</div>

<!-- Opis stanowiska -->
<div class="form-card">
	<div class="form-card-title">Job Description</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="job-wdesc">Workplace Description</label>
			{#if currentLang}
				<textarea id="job-wdesc" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={$form.lang[currentLang]?.workplaceDesc ?? ""} readonly></textarea>
			{:else}
				<textarea id="job-wdesc" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={$form.workplaceDesc}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-req">Requirements <span class="req">*</span></label>
			{#if currentLang}
				<textarea id="job-req" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={$form.lang[currentLang]?.requirements ?? ""} readonly></textarea>
			{:else}
				<textarea id="job-req" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={$form.requirements}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-duties">Responsibilities</label>
			{#if currentLang}
				<textarea id="job-duties" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={$form.lang[currentLang]?.duties ?? ""} readonly></textarea>
			{:else}
				<textarea id="job-duties" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={$form.duties}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-extra">Additional Information</label>
			{#if currentLang}
				<textarea id="job-extra" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={$form.lang[currentLang]?.extra ?? ""} readonly></textarea>
			{:else}
				<textarea id="job-extra" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={$form.extra}></textarea>
			{/if}
		</div>
	</div>
</div>

<!-- Actions -->
<div class="d-flex gap-2 justify-content-end mt-2 mb-4">
	{#if translating}
		Translating offer...
	{:else}
		<button class="btn btn-eisg-ghost" onclick={() => form.reset()}>
			<UIcon name="rotate-left" />
			Clear
		</button>
		<button class="btn btn-eisg-danger" onclick={translateForm}>
			<UIcon name="language-exchange" />
			Translate
		</button>
		<button class="btn btn-eisg-success" onclick={saveOffer}>
			<UIcon name="disk" />
			Save Offer
		</button>
		<button class="btn btn-eisg-primary" onclick={openPreview}>
			<UIcon name="eye" />
			Preview / Generate
		</button>
	{/if}
</div>
