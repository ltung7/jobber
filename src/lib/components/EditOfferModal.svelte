<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';
	import { addToast } from '$lib/toast';
	import axios from 'axios';
	import { LANGUAGES, ACCOMMODATION_OPTION_LIST, SHIFT_OPTION_LIST, BENEFITS_LIST, CONTRACT_OPTION_LIST, TRANSLATE_LANGS } from './const';

	interface Props {
		editingOffer: SavedOffer;
		close: () => void;
		save: () => void;
	}
	const { editingOffer, close, save }: Props = $props();

	let translating = $state(false);
	let currentLang: false | Lang = $state(false);
	let hasTranslations: Array<Lang> = $derived(Object.keys(editingOffer.lang) as Lang[]);

	async function translateForm() {
		const fields: TranslatableJobInfo = {
			workplaceDesc: editingOffer.workplaceDesc,
			requirements: editingOffer.requirements,
			duties: editingOffer.duties,
			extra: editingOffer.extra,
			jobType: editingOffer.jobType
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
			editingOffer.lang = translated;

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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	onclick={(e) => {
		if (e.target === e.currentTarget) close();
	}}
>
	<div class="modal-box wide">
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button class="btn-close position-absolute" style="top:16px;right:16px;" onclick={close}></button>
		<div class="modal-title">Edit Offer</div>
		<div class="modal-sub">{editingOffer.jobType} · {editingOffer.location}, {editingOffer.city}</div>

		<!-- Lang selector -->
		<div class="lang-row position-sticky top-0">
			<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={!currentLang} onclick={() => (currentLang = false)}>
				{@html LANGUAGES.en}
			</button>
			{#if hasTranslations.length}
				{#each hasTranslations as lang}
					<button class="button btn btn-sm btn-eisg-ghost mx-1 mb-1" class:active={lang === currentLang} onclick={() => (currentLang = lang)}>
						{@html LANGUAGES[lang]}
					</button>
				{/each}
			{/if}
		</div>

		<div class="row g-3 mb-3">
			<div class="col-12">
				<label class="field-label" for="job-type">Job Title <span class="req">*</span></label>
				{#if currentLang}
					<input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" value={editingOffer.lang[currentLang]?.jobType ?? ''} readonly />
				{:else}
					<input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" bind:value={editingOffer.jobType} />
				{/if}
			</div>
			<div class="col-md-6">
				<label class="field-label" for="job-location">Address of workplace<span class="req">*</span></label>
				<input id="job-location" type="text" class="form-control" placeholder="e.g. 12 Przemysłowa St." bind:value={editingOffer.location} />
			</div>
			<div class="col-md-6">
				<label class="field-label" for="job-location">City<span class="req">*</span></label>
				<input id="job-location" type="text" class="form-control" placeholder="e.g. Poznań" bind:value={editingOffer.city} />
			</div>
			<div class="col-md-6">
				<label class="field-label" for="job-available">Available from <span class="req">*</span></label>
				<input id="job-available" type="date" class="form-control" bind:value={editingOffer.availableFrom} />
			</div>
			<div class="col-md-6">
				<label class="field-label" for="job-housing">Accommodation</label>
				<select id="job-housing" class="form-select" bind:value={editingOffer.accommodation}>
					{#each Object.entries(ACCOMMODATION_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
				</select>
			</div>

			<div class="col-12 col-md-6">
				<label class="field-label" for="job-rateTo">Hourly Rate <span class="req">*</span></label>
				<div class="d-flex align-items-center">
					<span class="text-muted small me-2">from</span>
					<input id="job-rateFrom" type="number" class="form-control" bind:value={editingOffer.rateFrom} />
					<span class="text-muted small mx-2">to</span>
					<input id="job-rateTo" type="number" class="form-control" bind:value={editingOffer.rateTo} />
					<input id="job-rateNet" type="checkbox" class="ms-3 me-1" bind:checked={editingOffer.rateNet} />
					<label class="field-label mb-0 text-normal mx-0" for="job-rateNet">net</label>
				</div>
			</div>
			<div class="col-12 col-md-6">
				<label class="field-label" for="offerRef">Reference No.</label>
				<input id="offerRef" type="text" class="form-control" bind:value={editingOffer.offerRef} />
			</div>
			<div class="col-12 col-md-6">
				<label class="field-label" for="job-contract">Contract Type</label>
				<select id="job-contract" class="form-select" bind:value={editingOffer.contractType}>
					<option value="">— select —</option>
					{#each Object.entries(CONTRACT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
				</select>
			</div>
			<div class="col-12 col-md-6">
				<label class="field-label" for="job-shifts">Shift System</label>
				<select id="job-shifts" class="form-select" bind:value={editingOffer.shift}>
					<option value="">— select —</option>
					{#each Object.entries(SHIFT_OPTION_LIST) as [opt, caption]}<option value={opt}>{caption}</option>{/each}
				</select>
			</div>
			<div class="col-12">
				<label class="field-label" for="job-benefits">Additional Benefits</label>
				<fieldset class="benefits-container">
					{#each Object.entries(BENEFITS_LIST) as [value, caption]}
						<label class="checkbox-item small d-block">
							<input type="checkbox" {value} bind:group={editingOffer.benefits} />
							<span>{caption}</span>
						</label>
					{/each}
				</fieldset>
			</div>

			<div class="col-12">
				<label class="field-label" for="job-wdesc">Workplace Description</label>
				{#if currentLang}
					<textarea id="job-wdesc" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={editingOffer.lang[currentLang]?.workplaceDesc ?? ''} readonly></textarea>
				{:else}
					<textarea id="job-wdesc" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={editingOffer.workplaceDesc}></textarea>
				{/if}
			</div>
			<div class="col-12">
				<label class="field-label" for="job-req">Requirements <span class="req">*</span></label>
				{#if currentLang}
					<textarea id="job-req" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={editingOffer.lang[currentLang]?.requirements ?? ''} readonly></textarea>
				{:else}
					<textarea id="job-req" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={editingOffer.requirements}></textarea>
				{/if}
			</div>
			<div class="col-12">
				<label class="field-label" for="job-duties">Responsibilities</label>
				{#if currentLang}
					<textarea id="job-duties" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={editingOffer.lang[currentLang]?.duties ?? ''} readonly></textarea>
				{:else}
					<textarea id="job-duties" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={editingOffer.duties}></textarea>
				{/if}
			</div>
			<div class="col-12">
				<label class="field-label" for="job-extra">Additional Information</label>
				{#if currentLang}
					<textarea id="job-extra" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." value={editingOffer.lang[currentLang]?.extra ?? ''} readonly></textarea>
				{:else}
					<textarea id="job-extra" class="form-control" rows="3" placeholder="e.g. Modern high-bay warehouse..." bind:value={editingOffer.extra}></textarea>
				{/if}
			</div>
		</div>

		<div class="d-flex gap-2 justify-content-end">
			<button class="btn btn-eisg-ghost" onclick={close}>Cancel</button>
			<button class="btn btn-eisg-danger" onclick={translateForm}>
				<UIcon name="language-exchange" />
				Translate
			</button>
			<button class="btn btn-eisg-primary" onclick={save}>
				<UIcon name="disk" />
				Save Changes
			</button>
		</div>
	</div>
</div>
