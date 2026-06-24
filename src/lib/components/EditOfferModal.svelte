<script lang="ts">
	import CustomFormSelect from "$lib/misc/CustomFormSelect.svelte";
	import UIcon from "$lib/misc/UIcon.svelte";
	import { CONTRACT_OPTIONS, SHIFT_OPTIONS, LANGUAGES } from "./const";

    interface Props {
        editingOffer: SavedOffer,
        close: () => void,
        save: () => void
    }
	const { editingOffer, close, save }: Props = $props()
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
		<div class="modal-title">Edytuj ofertę</div>
		<div class="modal-sub">{editingOffer.jobType} · {editingOffer.location}</div>

		<div class="lang-row mb-3">
			<span class="lang-row-label">Język</span>
			<CustomFormSelect list={LANGUAGES} bind:value={editingOffer.langExtra} />
		</div>

		<div class="row g-3 mb-3">
			<div class="col-md-6">
				<label class="field-label" for="jobType">Rodzaj pracy <span class="req">*</span></label>
				<input id="jobType" type="text" class="form-control" bind:value={editingOffer.jobType} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="location">Miejsce pracy <span class="req">*</span></label>
				<input id="location" type="text" class="form-control" bind:value={editingOffer.location} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="availableFrom">Dostępne od</label>
				<input id="availableFrom" type="date" class="form-control" bind:value={editingOffer.availableFrom} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="housing">Zakwaterowanie</label>
				<input id="housing" type="text" class="form-control" bind:value={editingOffer.housing} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="rate">Stawka godzinowa <span class="req">*</span></label>
				<input id="rate" type="text" class="form-control" bind:value={editingOffer.rate} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="contract">Rodzaj umowy</label>
				<select id="contract" class="form-select" bind:value={editingOffer.contract}>
					<option value="">— wybierz —</option>
					{#each CONTRACT_OPTIONS as opt}
						<option>{opt}</option>
					{/each}
				</select>
			</div>

			<div class="col-md-6">
				<label class="field-label" for="shifts">Zmianowość</label>
				<select id="shifts" class="form-select" bind:value={editingOffer.shifts}>
					<option value="">— wybierz —</option>
					{#each SHIFT_OPTIONS as opt}
						<option>{opt}</option>
					{/each}
				</select>
			</div>

			<div class="col-md-6">
				<label class="field-label" for="benefits">Benefity</label>
				<input id="benefits" type="text" class="form-control" bind:value={editingOffer.benefits} />
			</div>

			<div class="col-12">
				<label class="field-label" for="workplaceDesc">Opis miejsca pracy</label>
				<textarea id="workplaceDesc" class="form-control" rows="2" bind:value={editingOffer.workplaceDesc}></textarea>
			</div>

			<div class="col-12">
				<label class="field-label" for="requirements">Wymagania <span class="req">*</span></label>
				<textarea id="requirements" class="form-control" rows="3" bind:value={editingOffer.requirements}></textarea>
			</div>

			<div class="col-12">
				<label class="field-label" for="duties">Obowiązki</label>
				<textarea id="duties" class="form-control" rows="3" bind:value={editingOffer.duties}></textarea>
			</div>

			<div class="col-12">
				<label class="field-label" for="extra">Dodatkowe informacje</label>
				<textarea id="extra" class="form-control" rows="2" bind:value={editingOffer.extra}></textarea>
			</div>

			<div class="col-md-6">
				<label class="field-label" for="recruiterName">Rekruter</label>
				<input id="recruiterName" type="text" class="form-control" bind:value={editingOffer.recruiterName} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="recruiterPhone">Telefon / WhatsApp</label>
				<input id="recruiterPhone" type="text" class="form-control" bind:value={editingOffer.recruiterPhone} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="recruiterEmail">E-mail</label>
				<input id="recruiterEmail" type="text" class="form-control" bind:value={editingOffer.recruiterEmail} />
			</div>

			<div class="col-md-6">
				<label class="field-label" for="offerRef">Nr referencyjny</label>
				<input id="offerRef" type="text" class="form-control" bind:value={editingOffer.offerRef} />
			</div>

			<div class="col-12">
				<label class="field-label" for="sheetsUrl">Link Google Sheets (kandydaci)</label>
				<input id="sheetsUrl" type="url" class="form-control" bind:value={editingOffer.sheetsUrl} />
			</div>
		</div>

		<div class="d-flex gap-2 justify-content-end">
			<button class="btn btn-eisg-ghost" onclick={close}>Anuluj</button>
			<button class="btn btn-eisg-primary" onclick={save}>
				<UIcon name="disk" />
				Zapisz zmiany
			</button>
		</div>
	</div>
</div>
