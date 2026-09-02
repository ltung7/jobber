<script lang="ts">
	import { addToast } from '$lib/toast';
	import axios from 'axios';
	import { writable } from 'svelte/store';
	import { CONTRACT_OPTION_LIST, SHIFT_OPTION_LIST, LANGUAGES, ACCOMMODATION_OPTION_LIST, BENEFITS_LIST } from './const';
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
</script>

<div class="page-header mb-4">
    <h1 class="fs-5 fw-semibold mb-1">New Job Offer</h1>
    <p class="text-muted" style="font-size:13px;">Fill out the form — select the PDF language and generate the offer.</p>
</div>

<!-- Lang selector -->
<div class="lang-row">
    <span class="lang-row-label">PDF Language</span>
    <CustomFormSelect list={LANGUAGES} bind:value={$form.langExtra} />
    <span class="lang-note">1 offer = 1 language = 1 PDF. Messenger is always in EN.</span>
</div>

<!-- Stanowisko -->
<div class="form-card">
    <div class="form-card-title">Position & Location</div>
    <div class="row g-3">
        <div class="col-12">
            <label class="field-label" for="job-type">Job Title <span class="req">*</span></label>
            <input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" bind:value={$form.jobType} />
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
            <textarea id="job-wdesc" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={$form.workplaceDesc}></textarea>
        </div>
        <div class="col-12">
            <label class="field-label" for="job-req">Requirements <span class="req">*</span></label>
            <textarea id="job-req" class="form-control" rows="3" placeholder="e.g. Min. 1 year experience, UDT licence" bind:value={$form.requirements}></textarea>
        </div>
        <div class="col-12">
            <label class="field-label" for="job-duties">Responsibilities</label>
            <textarea id="job-duties" class="form-control" rows="3" placeholder="e.g. Operating production line, order picking" bind:value={$form.duties}></textarea>
        </div>
        <div class="col-12">
            <label class="field-label" for="job-extra">Additional Information</label>
            <textarea id="job-extra" class="form-control" rows="2" placeholder="e.g. Family relocation possible" bind:value={$form.extra}></textarea>
        </div>
    </div>
    <!-- Translate row -->
    <div class="d-flex align-items-center gap-2 flex-wrap mt-3 pt-3" style="border-top:1px solid #d8e4e4;">
        <span style="font-size:11px;font-weight:700;color:#8fa0ae;text-transform:uppercase;letter-spacing:0.05em;">Translate content via AI:</span>
        <button class="btn btn-eisg-ghost btn-sm" onclick={() => translateForm('en')} disabled={translating}>
            <UIcon name="translate" />
            Generate EN
        </button>
        <button class="btn btn-eisg-ghost btn-sm" onclick={() => translateForm('pl')} disabled={translating}>
            <UIcon name="translate" />
            Generate PL
        </button>
        {#if translating}
            <span class="spinner-border spinner-border-sm text-primary" style="width: 16px; height: 16px;" role="status" aria-hidden="true"></span>
        {/if}
        <span style="font-size:11px;color:#8fa0ae;">Translates: description, requirements, duties, info</span>
    </div>
</div>

<!-- Actions -->
<div class="d-flex gap-2 justify-content-end mt-2 mb-4">
    <button class="btn btn-eisg-ghost" onclick={() => form.reset()}>
        <UIcon name="rotate-left" />
        Clear
    </button>
    <button class="btn btn-eisg-success" onclick={saveOffer}>
        <UIcon name="disk" />
        Save Offer
    </button>
    <button class="btn btn-eisg-primary" onclick={openPreview}>
        <UIcon name="eye" />
        Preview / Generate
    </button>
</div>