<script lang="ts">
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import CustomFormSelect from '$lib/misc/CustomFormSelect.svelte';
	import { addToast } from '$lib/toast';
	import type { Contractee } from '$lib/server/db/firebase/recruiterContractee.fdb';

	let {
		isOpen = $bindable(false),
		contractee = null,
		recruiterOptions = {},
		onSaved
	}: {
		isOpen: boolean;
		contractee?: Contractee | null;
		recruiterOptions?: Record<string, string>;
		onSaved?: (c: Contractee) => void;
	} = $props();

	let id = $state<string | undefined>(undefined);
	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let deliveryMethod = $state<'email' | 'SMS'>('email');
	let paymentMethod = $state<'bank' | 'cash'>('bank');
	let bankAccount = $state('');
	let selectedRecruiterId = $state<string>('none');
	let newRecruiterName = $state('');

	let saving = $state(false);

	const recruiterDropdownList = $derived({
		none: 'No assigned recruiter',
		create_new: '+ Create new recruiter in Bitrix list',
		...recruiterOptions
	});

	$effect(() => {
		if (isOpen) {
			if (contractee) {
				id = contractee.id;
				name = contractee.name || '';
				phone = contractee.phone || '';
				email = contractee.email || '';
				deliveryMethod = contractee.deliveryMethod || 'email';
				paymentMethod = contractee.paymentMethod || 'bank';
				bankAccount = contractee.bankAccount || '';
				selectedRecruiterId = contractee.recruiterId ? String(contractee.recruiterId) : 'none';
				newRecruiterName = '';
			} else {
				id = undefined;
				name = '';
				phone = '';
				email = '';
				deliveryMethod = 'email';
				paymentMethod = 'bank';
				bankAccount = '';
				selectedRecruiterId = 'none';
				newRecruiterName = '';
			}
		}
	});

	// Auto-adjust delivery method if email is empty
	$effect(() => {
		if (!email.trim() && phone.trim()) {
			deliveryMethod = 'SMS';
		}
	});

	async function handleSave() {
		if (!name.trim()) {
			addToast('Contractee name is required', 'warning');
			return;
		}

		if (deliveryMethod === 'SMS' && !phone.trim()) {
			addToast('Phone number is required for SMS delivery', 'warning');
			return;
		}

		if (selectedRecruiterId === 'create_new' && !newRecruiterName.trim() && !name.trim()) {
			addToast('Please enter a name for the new recruiter in Bitrix', 'warning');
			return;
		}

		saving = true;
		try {
			const res = await fetch('/contracts/api/contractees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id,
					name: name.trim(),
					phone: phone.trim(),
					email: email.trim(),
					deliveryMethod,
					paymentMethod,
					bankAccount: paymentMethod === 'bank' ? bankAccount.trim() : '',
					recruiterId: selectedRecruiterId !== 'none' ? selectedRecruiterId : '',
					recruiterName: recruiterOptions[selectedRecruiterId] || (selectedRecruiterId === 'create_new' ? (newRecruiterName || name) : ''),
					newRecruiterName: newRecruiterName.trim() || name.trim(),
				})
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Failed to save contractee');
			}

			addToast('Contractee saved successfully', 'success');
			if (onSaved && data.contractee) {
				onSaved(data.contractee);
			}
			isOpen = false;
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error saving contractee', 'danger');
		} finally {
			saving = false;
		}
	}
</script>

<ClosableModal bind:isOpen headerText={id ? 'Edit Contractee (Party 2)' : 'New Contractee (Party 2 / Recommender)'} size="lg">
	<div class="p-2">
		<div class="row g-3">
			<!-- Name -->
			<div class="col-12 col-md-6">
				<label for="contracteeName" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Full Name <span class="text-danger">*</span>
				</label>
				<input
					id="contracteeName"
					type="text"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="e.g. Ram Kumar / Jan Kowalski"
					bind:value={name}
				/>
			</div>

			<!-- Assigned Recruiter (Bitrix Enum) -->
			<div class="col-12 col-md-6">
				<span class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1 d-block">
					Assigned Recruiter (Bitrix List)
				</span>
				<CustomFormSelect
					list={recruiterDropdownList}
					bind:value={selectedRecruiterId}
				/>
				{#if selectedRecruiterId === 'create_new'}
					<div class="mt-2">
						<input
							type="text"
							class="form-control form-control-sm text-xs border-slate-200 bg-white"
							placeholder="Enter recruiter name to add to Bitrix list..."
							bind:value={newRecruiterName}
						/>
						<div class="text-muted text-2xs mt-0.5">Will be added directly into Bitrix recruiter userfield list.</div>
					</div>
				{/if}
			</div>

			<!-- Phone -->
			<div class="col-12 col-md-6">
				<label for="contracteePhone" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Phone Number
					{#if deliveryMethod === 'SMS'}
						<span class="text-danger">* (Required for SMS)</span>
					{/if}
				</label>
				<input
					id="contracteePhone"
					type="tel"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="+48 500 000 000"
					bind:value={phone}
				/>
			</div>

			<!-- Email -->
			<div class="col-12 col-md-6">
				<label for="contracteeEmail" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
					Email Address
				</label>
				<input
					id="contracteeEmail"
					type="email"
					class="form-control form-control-sm text-xs border-slate-200"
					placeholder="recommender@example.com"
					bind:value={email}
				/>
			</div>

			<!-- Delivery Method -->
			<div class="col-12 col-md-6">
				<span class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1 d-block">Preferred Signing Delivery</span>
				<div class="d-flex align-items-center gap-2">
					<button
						type="button"
						class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {deliveryMethod === 'email' ? 'btn-primary' : 'btn-outline-secondary'}"
						onclick={() => (deliveryMethod = 'email')}
					>
						<UIcon name="envelope" size="6" class="me-1" />
						<span>Email</span>
					</button>
					<button
						type="button"
						class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {deliveryMethod === 'SMS' ? 'btn-info text-white' : 'btn-outline-secondary'}"
						onclick={() => (deliveryMethod = 'SMS')}
					>
						<UIcon name="phone-call" size="6" class="me-1" />
						<span>SMS Mobile</span>
					</button>
				</div>
			</div>

			<!-- Payment Method -->
			<div class="col-12 col-md-6">
				<span class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1 d-block">Payout Method</span>
				<div class="d-flex align-items-center gap-2">
					<button
						type="button"
						class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {paymentMethod === 'bank' ? 'btn-primary' : 'btn-outline-secondary'}"
						onclick={() => (paymentMethod = 'bank')}
					>
						<UIcon name="bank" size="6" class="me-1" />
						<span>Bank Transfer</span>
					</button>
					<button
						type="button"
						class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {paymentMethod === 'cash' ? 'btn-success text-white' : 'btn-outline-secondary'}"
						onclick={() => (paymentMethod = 'cash')}
					>
						<UIcon name="money" size="6" class="me-1" />
						<span>Cash (Gotówka)</span>
					</button>
				</div>
			</div>

			<!-- Bank Account -->
			{#if paymentMethod === 'bank'}
				<div class="col-12">
					<label for="contracteeBank" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
						Bank Account Number (IBAN)
					</label>
					<input
						id="contracteeBank"
						type="text"
						class="form-control form-control-sm text-xs border-slate-200 font-monospace"
						placeholder="PL 00 0000 0000 0000 0000 0000 0000"
						bind:value={bankAccount}
					/>
				</div>
			{/if}
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
					<span>{id ? 'Update Contractee' : 'Save Contractee'}</span>
				{/if}
			</button>
		</div>
	{/snippet}
</ClosableModal>
