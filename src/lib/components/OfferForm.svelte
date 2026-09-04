<script lang="ts">
	import { addToast } from '$lib/toast';
	import axios from 'axios';
	import { CONTRACT_OPTION_LIST, SHIFT_OPTION_LIST, LANGUAGES, ACCOMMODATION_OPTION_LIST, BENEFITS_LIST, TRANSLATE_LANGS } from './const';
	import UIcon from '$lib/misc/UIcon.svelte';
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import ShareButton from '$lib/misc/ShareButton.svelte';
	import { PUBLIC_OFFER_URL } from '$env/static/public';

	interface Props {
		form: JobFormData | SavedOffer;
		onSave?: () => void;
		onPreview?: () => void;
		children?: Snippet;
	}

	const { form = $bindable(), onSave, onPreview, children }: Props = $props();

	let currentLang: false | Lang = $state(false);
	let translating = $state(false);
	let hasTranslations: Array<Lang> = $derived(Object.keys(form.lang) as Lang[]);
	let dirty: Set<keyof TranslatableJobInfo> = $state(new Set());

	function markDirty(field: keyof TranslatableJobInfo) {
		if (!currentLang) {
			dirty = new Set([...dirty, field]);
		}
	}

	async function translateForm() {
		const fields: TranslatableJobInfo = {
			workplaceDesc: form.workplaceDesc,
			requirements: form.requirements,
			duties: form.duties,
			extra: form.extra,
			jobType: form.jobType
		};

		if (!Object.values(fields).some((v) => v.length > 0)) {
			addToast('The form is empty — fill in the content first.', 'info');
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
			form.lang = translated;

			addToast('Translated!', 'success');
			dirty.clear()
		} catch (e) {
			if (axios.isAxiosError(e)) {
				const msg = e.response?.data?.message ?? 'Translation error — check your connection.';
				addToast(msg, 'error');
			} else {
				addToast('Unexpected translation error.', 'error');
			}
			console.error('[translateForm]', e);
		} finally {
			translating = false;
		}
	}

	export function validate(): boolean {
		if (!form.jobType) {
			addToast('Please fill in the field: Job Title');
			return false;
		}
		if (!form.city) {
			addToast('Please fill in the field: City');
			return false;
		}
		if (!form.rateTo) {
			addToast('Please fill in the field: Hourly Rate');
			return false;
		}
		if (!form.requirements) {
			addToast('Please fill in the field: Requirements');
			return false;
		}

		// Format text fields
		form.requirements = formatTextField(form.requirements);
		form.workplaceDesc = formatTextField(form.workplaceDesc);
		form.duties = formatTextField(form.duties);
		form.extra = formatTextField(form.extra);

		return true;
	}

	function formatTextField(text: string): string {
		if (!text) return text;

		// Rule 1: Remove extra new lines (\n or \r\n) - normalize to single \n
		let formatted = text.replace(/\r?\n+/g, '\n');

		// Rule 3: Remove leading * or - characters from each line
		formatted = formatted.replace(/^\s*[\*\-\•]\s+/gm, '');

		// Rule 2: If there are no \n, but many ., add \n to each . except the last
		if (!formatted.includes('\n') && formatted.split('.').length > 3) {
			// Split by period, filter empty, then join with .\n except last
			const parts = formatted.split('.').filter(p => p.trim().length > 0);
			if (parts.length > 1) {
				formatted = parts.map((p, i) => {
					const trimmed = p.trim();
					return i < parts.length - 1 ? `${trimmed}.` : trimmed;
				}).join('\n');
			}
		}

		return formatted;
	}

	async function save() {
		if (!validate()) return;
		if (dirty.size > 0) {
			await translateForm();
		}
		onSave?.();
	}
</script>

<!-- Language Selector (shared between modes) -->
<div class="lang-row position-sticky top-0 p-1">
	{#if translating}
		<div class="p-2 small fst-italic text-info text-center w-100">Translation in progress. We'll have your offer ready momentarily. Please wait...</div>
	{:else if hasTranslations.length}
		<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={!currentLang} onclick={() => (currentLang = false)}>
			{@html LANGUAGES.en}
		</button>
		{#each hasTranslations as lang}
			<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={lang === currentLang} onclick={() => (currentLang = lang)}>
				{@html LANGUAGES[lang]}
			</button>
		{/each}
	{:else}
		<div class="p-2 small fst-italic text-muted text-center w-100">This job offer is currently in English. Click Save to automatically translate and save your changes.</div>
	{/if}
</div>

<!-- Publicity -->
<div class="form-card">
	<div class="form-card-title">Publicity and sharing</div>
	<div class="row g-3">
		<div class="col-md-6">
			<label class="field-label" for="job-public">Share this offer publicly</label>
			<div class="form-check form-switch form-switch-big d-flex align-items-center">
				<input id="job-public" class="form-check-input" type="checkbox" bind:checked={form.public} />
				<label class="form-check-label ms-3 mb-0 text-inherit transition fs-6" for="job-public">
					Offer is
					{#if form.public}
						<span class="text-success fw-bold">Public</span>
					{:else}
						<span class="text-dark fw-bold">Private</span>
					{/if}
				</label>
			</div>
		</div>
		{#if form.public && 'id' in form}
			<div class="col-md-6" transition:fly>
				<label class="field-label" for="any">Link to view / share</label>
				<ShareButton url={PUBLIC_OFFER_URL + '/offers/' + form.id} />
			</div>
		{/if}
	</div>
</div>
<!-- Position & Location -->
<div class="form-card">
	<div class="form-card-title">Position & Location</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="job-type">Job Title <span class="req">*</span></label>
			{#if currentLang}
				<input id="job-type" type="text" class="form-control" value={form.lang[currentLang]?.jobType ?? ''} readonly />
			{:else}
				<input id="job-type" type="text" class="form-control" bind:value={form.jobType} oninput={() => markDirty('jobType')} />
			{/if}
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-location">Address of workplace<span class="req">*</span></label>
			<input id="job-location" type="text" class="form-control" placeholder="e.g. 12 Przemysłowa St." bind:value={form.location} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-city">City<span class="req">*</span></label>
			<input id="job-city" type="text" class="form-control" placeholder="e.g. Poznań" bind:value={form.city} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-available">Available from <span class="req">*</span></label>
			<input id="job-available" type="date" class="form-control" bind:value={form.availableFrom} />
		</div>
		<div class="col-md-6">
			<label class="field-label" for="job-housing">Accommodation</label>
			<select id="job-housing" class="form-select" bind:value={form.accommodation}>
				{#each Object.entries(ACCOMMODATION_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
	</div>
</div>

<!-- Employment Terms -->
<div class="form-card">
	<div class="form-card-title">Employment Terms</div>
	<div class="row g-3">
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-rateTo">Hourly Rate <span class="req">*</span></label>
			<div class="d-flex align-items-center">
				<span class="text-muted small me-2">from</span>
				<input id="job-rateFrom" type="number" class="form-control" bind:value={form.rateFrom} />
				<span class="text-muted small mx-2">to</span>
				<input id="job-rateTo" type="number" class="form-control" bind:value={form.rateTo} />
				<input id="job-rateNet" type="checkbox" class="ms-3 me-1" bind:checked={form.rateNet} />
				<label class="field-label mb-0 text-normal mx-0" for="job-rateNet">net</label>
			</div>
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="offerRef">Reference No.</label>
			<input id="offerRef" type="text" class="form-control" bind:value={form.offerRef} />
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-contract">Contract Type</label>
			<select id="job-contract" class="form-select" bind:value={form.contractType}>
				<option value="">— select —</option>
				{#each Object.entries(CONTRACT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
		<div class="col-12 col-md-6">
			<label class="field-label" for="job-shifts">Shift System</label>
			<select id="job-shifts" class="form-select" bind:value={form.shift}>
				<option value="">— select —</option>
				{#each Object.entries(SHIFT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
			</select>
		</div>
		<div class="col-12">
			<label class="field-label" for="job-benefits">Additional Benefits</label>
			<fieldset class="benefits-container">
				{#each Object.entries(BENEFITS_LIST) as [value, caption]}
					<label class="checkbox-item small d-block">
						<input type="checkbox" {value} bind:group={form.benefits} />
						<span>{caption}</span>
					</label>
				{/each}
			</fieldset>
		</div>
	</div>
</div>

<!-- Job Description -->
<div class="form-card">
	<div class="form-card-title">Job Description</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="job-wdesc">Workplace Description</label>
			{#if currentLang}
				<textarea id="job-wdesc" class="form-control" rows="3" value={form.lang[currentLang]?.workplaceDesc ?? ''} readonly></textarea>
			{:else}
				<textarea id="job-wdesc" class="form-control" rows="3" bind:value={form.workplaceDesc} oninput={() => markDirty('workplaceDesc')}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-req">Requirements <span class="req">*</span></label>
			{#if currentLang}
				<textarea id="job-req" class="form-control" rows="3" value={form.lang[currentLang]?.requirements ?? ''} readonly></textarea>
			{:else}
				<textarea id="job-req" class="form-control" rows="3" bind:value={form.requirements} oninput={() => markDirty('requirements')}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-duties">Responsibilities</label>
			{#if currentLang}
				<textarea id="job-duties" class="form-control" rows="3" value={form.lang[currentLang]?.duties ?? ''} readonly></textarea>
			{:else}
				<textarea id="job-duties" class="form-control" rows="3" bind:value={form.duties} oninput={() => markDirty('duties')}></textarea>
			{/if}
		</div>
		<div class="col-12">
			<label class="field-label" for="job-extra">Additional Information</label>
			{#if currentLang}
				<textarea id="job-extra" class="form-control" rows="3" value={form.lang[currentLang]?.extra ?? ''} readonly></textarea>
			{:else}
				<textarea id="job-extra" class="form-control" rows="3" bind:value={form.extra} oninput={() => markDirty('extra')}></textarea>
			{/if}
		</div>
	</div>
</div>

<!-- Actions -->
<div class="d-flex gap-2 justify-content-end mt-2 mb-4">
	{#if translating}
		<span class="text-muted">Translating offer...</span>
	{:else}
		{@render children?.()}
		<button class="btn btn-eisg-danger" onclick={translateForm}>
			<UIcon name="language-exchange" />
			Translate
		</button>
		<button class="btn btn-eisg-success" onclick={save}>
			<UIcon name="disk" />
			Save Offer
		</button>
		<button class="btn btn-eisg-primary" onclick={() => validate() && onPreview?.()}>
			<UIcon name="eye" />
			Preview / Generate
		</button>
	{/if}
</div>
