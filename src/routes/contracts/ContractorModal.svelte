<script lang="ts">
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import { addToast } from '$lib/toast';
	import type { Contractor } from '$lib/server/db/firebase/recruiterContractor.fdb';

	let {
		isOpen = $bindable(false),
		contractor = null,
		onSaved
	}: {
		isOpen: boolean;
		contractor?: Contractor | null;
		onSaved?: (c: Contractor) => void;
	} = $props();

	let id = $state<string | undefined>(undefined);
	let name = $state('');
	let nip = $state('');
	let regon = $state('');
	let krs = $state('');
	let address = $state('');
	let email = $state('');
	let phone = $state('');
	let isDefault = $state(false);

	let fetchingNip = $state(false);
	let saving = $state(false);

	$effect(() => {
		if (isOpen) {
			if (contractor) {
				id = contractor.id;
				name = contractor.name || '';
				nip = contractor.nip || '';
				regon = contractor.regon || '';
				krs = contractor.krs || '';
				address = contractor.address || '';
				email = contractor.email || '';
				phone = contractor.phone || '';
				isDefault = Boolean(contractor.isDefault);
			} else {
				id = undefined;
				name = '';
				nip = '';
				regon = '';
				krs = '';
				address = '';
				email = '';
				phone = '';
				isDefault = false;
			}
		}
	});

	async function fetchCompanyByNip() {
		const cleanNip = nip.replace(/\D/g, '');
		if (!cleanNip || cleanNip.length !== 10) {
			addToast('Please enter a valid 10-digit Polish NIP', 'warning');
			return;
		}

		fetchingNip = true;
		try {
			const res = await fetch(`/contracts/api/nip?nip=${cleanNip}`);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Failed to download company data');
			}

			const comp = data.company;
			name = comp.name || name;
			nip = comp.nip || nip;
			regon = comp.regon || regon;
			krs = comp.krs || krs;
			address = comp.address || address;
			addToast('Company details fetched successfully from Ministry of Finance (Biała Lista)', 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error fetching company from NIP', 'danger');
		} finally {
			fetchingNip = false;
		}
	}

	async function handleSave() {
		if (!name.trim() || !nip.trim() || !address.trim()) {
			addToast('Name, NIP, and Address are required', 'warning');
			return;
		}

		saving = true;
		try {
			const res = await fetch('/contracts/api/contractors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id,
					name,
					nip,
					regon,
					krs,
					address,
					email,
					phone,
					isDefault
				})
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Failed to save contractor');
			}

			addToast('Contractor saved successfully', 'success');
			if (onSaved && data.contractor) {
				onSaved(data.contractor);
			}
			isOpen = false;
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error saving contractor', 'danger');
		} finally {
			saving = false;
		}
	}
</script>

<ClosableModal bind:isOpen headerText={id ? 'Edit Contractor Company' : 'New Contractor Company (Party 1)'} size="lg">
	<div class="p-2">
		<div class="row g-3">
			<!-- NIP Input with download button -->
			<div class="col-12 col-md-6">
				<label for="contractorNip" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					NIP <span class="text-danger">*</span>
				</label>
				<div class="input-group input-group-sm">
					<input
						id="contractorNip"
						type="text"
						class="form-control form-control-sm text-xs border-slate-200"
						placeholder="e.g. 5252637218"
						bind:value={nip}
					/>
					<button
						type="button"
						class="btn btn-outline-primary btn-sm px-3 d-inline-flex align-items-center gap-1"
						onclick={fetchCompanyByNip}
						disabled={fetchingNip || !nip.trim()}
					>
						{#if fetchingNip}
							<span class="spinner-border spinner-border-sm" role="status"></span>
							<span class="text-2xs">Fetching...</span>
						{:else}
							<UIcon name="cloud-download" size="6" />
							<span class="text-2xs fw-bold">Fetch via NIP</span>
						{/if}
					</button>
				</div>
				<div class="text-muted text-2xs mt-1">Queries Ministry of Finance (Biała Lista) database.</div>
			</div>

			<!-- Company Name -->
			<div class="col-12 col-md-6">
				<label for="contractorName" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Company Legal Name <span class="text-danger">*</span>
				</label>
				<input
					id="contractorName"
					type="text"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. EISG Sp. z o.o."
					bind:value={name}
				/>
			</div>

			<!-- Address -->
			<div class="col-12">
				<label for="contractorAddress" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Registered Address <span class="text-danger">*</span>
				</label>
				<input
					id="contractorAddress"
					type="text"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. ul. Złota 59, 00-120 Warszawa"
					bind:value={address}
				/>
			</div>

			<!-- KRS & REGON -->
			<div class="col-12 col-md-6">
				<label for="contractorKrs" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					KRS
				</label>
				<input
					id="contractorKrs"
					type="text"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. 0000588661"
					bind:value={krs}
				/>
			</div>

			<div class="col-12 col-md-6">
				<label for="contractorRegon" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					REGON
				</label>
				<input
					id="contractorRegon"
					type="text"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. 363065097"
					bind:value={regon}
				/>
			</div>

			<!-- Email -->
			<div class="col-12 col-md-6">
				<label for="contractorEmail" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Company Email
				</label>
				<input
					id="contractorEmail"
					type="email"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. biuro@eisg.pl"
					bind:value={email}
				/>
			</div>

			<!-- Phone -->
			<div class="col-12 col-md-6">
				<label for="contractorPhone" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Company Phone
				</label>
				<input
					id="contractorPhone"
					type="tel"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. +48 22 123 45 67"
					bind:value={phone}
				/>
			</div>

			<!-- Is Default -->
			<div class="col-12 col-md-6 d-flex align-items-center pt-3">
				<div class="form-check form-switch">
					<input
						class="form-check-input"
						type="checkbox"
						role="switch"
						id="isDefaultSwitch"
						bind:checked={isDefault}
					/>
					<label class="form-check-label text-xs fw-semibold text-slate-800" for="isDefaultSwitch">
						Default Contractor for new contracts
					</label>
				</div>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<div class="d-flex align-items-center justify-content-end gap-2">
			<button type="button" class="btn btn-light btn-sm px-3" onclick={() => (isOpen = false)}>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-primary btn-sm px-4 fw-semibold shadow-xs d-inline-flex align-items-center gap-1.5"
				onclick={handleSave}
				disabled={saving}
			>
				{#if saving}
					<span class="spinner-border spinner-border-sm" role="status"></span>
					<span>Saving...</span>
				{:else}
					<UIcon name="check" size="6" />
					<span>{id ? 'Update Contractor' : 'Save Contractor'}</span>
				{/if}
			</button>
		</div>
	{/snippet}
</ClosableModal>
