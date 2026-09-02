<script lang="ts">
	import CustomFormSelect from '$lib/misc/CustomFormSelect.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import { LANGUAGES, ACCOMMODATION_OPTION_LIST, SHIFT_OPTION_LIST, BENEFITS_LIST, CONTRACT_OPTION_LIST } from './const';

	interface Props {
		editingOffer: SavedOffer;
		close: () => void;
		save: () => void;
	}
	const { editingOffer, close, save }: Props = $props();
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

        <div class="lang-row mb-3">
            <span class="lang-row-label">Language</span>
            <CustomFormSelect list={LANGUAGES} bind:value={editingOffer.langExtra} />
        </div>

        <div class="row g-3 mb-3">
            <div class="col-12">
                <label class="field-label" for="job-type">Job Title <span class="req">*</span></label>
                <input id="job-type" type="text" class="form-control" placeholder="e.g. Forklift Operator" bind:value={editingOffer.jobType} />
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
                <label class="field-label" for="workplaceDesc">Workplace Description</label>
                <textarea id="workplaceDesc" class="form-control" rows="2" bind:value={editingOffer.workplaceDesc}></textarea>
            </div>

            <div class="col-12">
                <label class="field-label" for="requirements">Requirements <span class="req">*</span></label>
                <textarea id="requirements" class="form-control" rows="3" bind:value={editingOffer.requirements}></textarea>
            </div>

            <div class="col-12">
                <label class="field-label" for="duties">Responsibilities</label>
                <textarea id="duties" class="form-control" rows="3" bind:value={editingOffer.duties}></textarea>
            </div>

            <div class="col-12">
                <label class="field-label" for="extra">Additional Information</label>
                <textarea id="extra" class="form-control" rows="2" bind:value={editingOffer.extra}></textarea>
            </div>
        </div>

        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-eisg-ghost" onclick={close}>Cancel</button>
            <button class="btn btn-eisg-primary" onclick={save}>
                <UIcon name="disk" />
                Save Changes
            </button>
        </div>
    </div>
</div>
