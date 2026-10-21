<script lang="ts">
	import type { PageData } from './$types';
	import type { ContractTemplate } from '$lib/server/db/firebase/recruiterContract.fdb';
	import type { SentEnvelope } from '$lib/server/db/firebase/recruiterEnvelope.fdb';
	import type { Contractor } from '$lib/server/db/firebase/recruiterContractor.fdb';
	import type { Contractee } from '$lib/server/db/firebase/recruiterContractee.fdb';
	import UIcon from '$lib/misc/UIcon.svelte';
	import TooltipText from '$lib/misc/TooltipText.svelte';
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import ContactAvatar from '$lib/components/ContactAvatar.svelte';
	import Toasts from '$lib/toast/Toasts.svelte';
	import { addToast } from '$lib/toast';
	import ContractEditorModal from './ContractEditorModal.svelte';
	import SendContractModal from './SendContractModal.svelte';
	import ContractorModal from './ContractorModal.svelte';
	import ContracteeModal from './ContracteeModal.svelte';
	import ContractPdfPreviewModal from './ContractPdfPreviewModal.svelte';
	import ContractRenderer from './ContractRenderer.svelte';
	import EisgTopbar from '$lib/components/EisgTopbar.svelte';
	import dayjs from 'dayjs';
	import { fly, slide } from 'svelte/transition';
	import { untrack } from 'svelte';

	const CONTACT_BASE_URL = 'https://eisg.bitrix24.pl/crm/contact/details/';

	let { data }: { data: PageData } = $props();

	// Active View Mode
	let activeView = $state<'envelopes' | 'templates' | 'contractees' | 'contractors'>('templates');
	let activeFilter = $state<'all' | 'signed' | 'pending' | 'declined'>('all');
	let selectedRecruiterFilter = $state<string>('all');

	// State
	let contracts = $state<ContractTemplate[]>(untrack(() => data.contracts || []));
	let envelopes = $state<SentEnvelope[]>(untrack(() => data.envelopes || []));
	let contractors = $state<Contractor[]>(untrack(() => data.contractors || []));
	let contractees = $state<Contractee[]>(untrack(() => data.contractees || []));
	let recruiterOptions = $state<Record<string, string>>(untrack(() => data.recruiterOptions || {}));

	// Modals
	let showEditorModal = $state(false);
	let showSendModal = $state(false);
	let showContractorModal = $state(false);
	let showContracteeModal = $state(false);
	let showPdfPreviewModal = $state(false);

	let editingContract = $state<ContractTemplate | null>(null);
	let sendingContract = $state<ContractTemplate | null>(null);
	let editingContractor = $state<Contractor | null>(null);
	let editingContractee = $state<Contractee | null>(null);
	let previewContract = $state<ContractTemplate | null>(null);

	function openPdfPreview(c: ContractTemplate) {
		previewContract = c;
		showPdfPreviewModal = true;
	}

	// Quick Add Contractor Form State
	let showQuickAddContractor = $state(false);
	let newCompNip = $state('');
	let newCompName = $state('');
	let newCompAddress = $state('');
	let newCompKrs = $state('');
	let newCompRegon = $state('');
	let newCompEmail = $state('');
	let newCompPhone = $state('');
	let newCompIsDefault = $state(false);
	let isFetchingQuickNip = $state(false);
	let isSavingQuickContractor = $state(false);

	async function fetchQuickNip() {
		const cleanNip = newCompNip.replace(/\D/g, '');
		if (!cleanNip || cleanNip.length !== 10) {
			addToast('Please enter a valid 10-digit Polish NIP', 'warning');
			return;
		}
		isFetchingQuickNip = true;
		try {
			const res = await fetch(`/contracts/api/nip?nip=${cleanNip}`);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Failed to download company data');
			}
			newCompName = data.company.name || newCompName;
			newCompNip = data.company.nip || newCompNip;
			newCompAddress = data.company.address || newCompAddress;
			newCompKrs = data.company.krs || newCompKrs;
			newCompRegon = data.company.regon || newCompRegon;
			addToast('Company details downloaded from Ministry of Finance (Biała Lista)!', 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error fetching NIP data', 'danger');
		} finally {
			isFetchingQuickNip = false;
		}
	}

	async function saveQuickContractor() {
		if (!newCompName.trim() || !newCompNip.trim() || !newCompAddress.trim()) {
			addToast('Company Name, NIP, and Address are required', 'warning');
			return;
		}
		isSavingQuickContractor = true;
		try {
			const res = await fetch('/contracts/api/contractors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newCompName.trim(),
					nip: newCompNip.trim(),
					address: newCompAddress.trim(),
					krs: newCompKrs.trim(),
					regon: newCompRegon.trim(),
					email: newCompEmail.trim(),
					phone: newCompPhone.trim(),
					isDefault: newCompIsDefault
				})
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Failed to save company');
			}
			addToast('Company saved successfully!', 'success');
			handleContractorSaved(data.contractor);
			newCompNip = '';
			newCompName = '';
			newCompAddress = '';
			newCompKrs = '';
			newCompRegon = '';
			newCompEmail = '';
			newCompPhone = '';
			newCompIsDefault = false;
			showQuickAddContractor = false;
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error saving company', 'danger');
		} finally {
			isSavingQuickContractor = false;
		}
	}

	// Expanded state for nested panels
	let expandedEnvelopes = $state<Record<string, boolean>>({});
	let expandedTemplates = $state<Record<string, boolean>>({});

	// Preview text modal
	let showTextModal = $state(false);
	let previewEnvelopeText = $state<{ title: string; text: string }>({ title: '', text: '' });

	// Search filters
	let searchFilter = $state('');

	// Action loading states
	let syncingIds = $state<Record<string, boolean>>({});
	let resendingIds = $state<Record<string, boolean>>({});

	// Sorting
	let sortColumn = $state<string>('date');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	function toggleSort(col: string) {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = 'desc';
		}
	}

	// High Level Metrics
	const totalEnvelopesCount = $derived(envelopes.length);
	const signedEnvelopes = $derived(envelopes.filter((e) => e.status?.toLowerCase() === 'completed' || e.status?.toLowerCase() === 'signed'));
	const signedCount = $derived(signedEnvelopes.length);
	const pendingEnvelopes = $derived(envelopes.filter((e) => e.status?.toLowerCase() === 'sent' || e.status?.toLowerCase() === 'delivered' || e.status?.toLowerCase() === 'in-progress'));
	const pendingCount = $derived(pendingEnvelopes.length);
	const smsDeliveryCount = $derived(envelopes.filter((e) => e.receiver?.deliveryMethod === 'SMS').length);
	const emailDeliveryCount = $derived(envelopes.filter((e) => e.receiver?.deliveryMethod !== 'SMS').length);
	const successRate = $derived(totalEnvelopesCount > 0 ? ((signedCount / totalEnvelopesCount) * 100).toFixed(1) : '0.0');
	const provisionForecastPLN = $derived((signedCount * 150).toLocaleString('de-DE'));
	const bitrixLinkedCount = $derived(envelopes.filter((e) => Boolean(e.bitrixContactId)).length);

	function toggleExpandEnvelope(id: string) {
		expandedEnvelopes[id] = !expandedEnvelopes[id];
	}

	function toggleExpandTemplate(id: string) {
		expandedTemplates[id] = !expandedTemplates[id];
	}

	// Envelope linking for a person / contractee
	function getContracteeEnvelopes(c: Contractee): SentEnvelope[] {
		return envelopes.filter((e) => {
			if (c.id && e.contracteeId === c.id) return true;
			if (c.bitrixContactId && e.bitrixContactId && String(e.bitrixContactId) === String(c.bitrixContactId)) return true;
			if (e.receiver?.name && c.name && e.receiver.name.trim().toLowerCase() === c.name.trim().toLowerCase()) return true;
			return false;
		});
	}

	// Filtered envelopes
	let filteredEnvelopes = $derived.by(() => {
		let list = envelopes.filter((env) => {
			const status = env.status?.toLowerCase();
			if (activeFilter === 'signed' && status !== 'completed' && status !== 'signed') return false;
			if (activeFilter === 'pending' && status !== 'sent' && status !== 'delivered' && status !== 'in-progress') return false;
			if (activeFilter === 'declined' && status !== 'declined' && status !== 'voided') return false;

			if (selectedRecruiterFilter !== 'all' && String(env.recruiterId || '') !== selectedRecruiterFilter) {
				return false;
			}

			if (searchFilter.trim()) {
				const q = searchFilter.toLowerCase();
				const matchName = (env.receiver?.name || '').toLowerCase().includes(q);
				const matchPhone = (env.receiver?.phone || '').toLowerCase().includes(q);
				const matchEmail = (env.receiver?.email || '').toLowerCase().includes(q);
				const matchBitrix = String(env.bitrixContactId || '')
					.toLowerCase()
					.includes(q);
				const matchTitle = (env.contractTitle || '').toLowerCase().includes(q);
				const matchRecruiter = (env.recruiterName || '').toLowerCase().includes(q);
				return matchName || matchPhone || matchEmail || matchBitrix || matchTitle || matchRecruiter;
			}
			return true;
		});

		list.sort((a, b) => {
			let valA: any, valB: any;
			switch (sortColumn) {
				case 'date':
					valA = a.createdAt || '';
					valB = b.createdAt || '';
					break;
				case 'name':
					valA = (a.receiver?.name || '').toLowerCase();
					valB = (b.receiver?.name || '').toLowerCase();
					break;
				case 'contract':
					valA = (a.contractTitle || '').toLowerCase();
					valB = (b.contractTitle || '').toLowerCase();
					break;
				case 'status':
					valA = a.status || '';
					valB = b.status || '';
					break;
				default:
					valA = a.createdAt || '';
					valB = b.createdAt || '';
			}

			if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
			if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		return list;
	});

	// Filtered templates
	let filteredTemplates = $derived(
		contracts.filter((c) => {
			if (searchFilter.trim()) {
				const q = searchFilter.toLowerCase();
				return (c.title || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
			}
			return true;
		})
	);

	// Filtered contractees
	let filteredContractees = $derived(
		contractees.filter((c) => {
			if (selectedRecruiterFilter !== 'all' && String(c.recruiterId || '') !== selectedRecruiterFilter) {
				return false;
			}
			if (searchFilter.trim()) {
				const q = searchFilter.toLowerCase();
				return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.recruiterName || '').toLowerCase().includes(q) || String(c.bitrixContactId || '').includes(q);
			}
			return true;
		})
	);

	// Filtered contractors
	let filteredContractors = $derived(
		contractors.filter((c) => {
			if (searchFilter.trim()) {
				const q = searchFilter.toLowerCase();
				return (c.name || '').toLowerCase().includes(q) || (c.nip || '').includes(q) || (c.krs || '').includes(q) || (c.address || '').toLowerCase().includes(q);
			}
			return true;
		})
	);

	// Template CRUD
	function openCreateContract() {
		editingContract = null;
		showEditorModal = true;
	}

	function openEditContract(contract: ContractTemplate) {
		editingContract = contract;
		showEditorModal = true;
	}

	function openSendContract(contract: ContractTemplate) {
		sendingContract = contract;
		showSendModal = true;
	}

	function handleContractSaved(saved: ContractTemplate) {
		const idx = contracts.findIndex((c) => c.id === saved.id);
		if (idx >= 0) {
			contracts[idx] = saved;
		} else {
			contracts.unshift(saved);
		}
	}

	async function handleDeleteContract(contract: ContractTemplate) {
		if (!contract.id) return;
		if (!confirm(`Are you sure you want to delete template: "${contract.title}"?`)) return;

		try {
			const res = await fetch(`/contracts/api?id=${contract.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message || 'Error deleting contract');
			contracts = contracts.filter((c) => c.id !== contract.id);
			addToast('Contract template deleted successfully.', 'success');
		} catch (err: any) {
			addToast(err?.message || 'Failed to delete template.', 'danger');
		}
	}

	// Contractor CRUD
	function openCreateContractor() {
		editingContractor = null;
		showContractorModal = true;
	}

	function openEditContractor(c: Contractor) {
		editingContractor = c;
		showContractorModal = true;
	}

	function handleContractorSaved(saved: Contractor) {
		const idx = contractors.findIndex((c) => c.id === saved.id);
		if (idx >= 0) {
			contractors[idx] = saved;
		} else {
			contractors.push(saved);
		}
		if (saved.isDefault) {
			contractors = contractors.map((c) => (c.id === saved.id ? c : { ...c, isDefault: false }));
		}
	}

	async function handleDeleteContractor(c: Contractor) {
		if (!c.id) return;
		if (!confirm(`Delete company: "${c.name}"?`)) return;

		try {
			const res = await fetch(`/contracts/api/contractors?id=${c.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message || 'Error deleting contractor');
			contractors = contractors.filter((item) => item.id !== c.id);
			addToast('Contractor company deleted.', 'success');
		} catch (err: any) {
			addToast(err?.message || 'Failed to delete contractor company.', 'danger');
		}
	}

	// Contractee CRUD
	function openCreateContractee() {
		editingContractee = null;
		showContracteeModal = true;
	}

	function openEditContractee(c: Contractee) {
		editingContractee = c;
		showContracteeModal = true;
	}

	function handleContracteeSaved(saved: Contractee) {
		const idx = contractees.findIndex((c) => c.id === saved.id);
		if (idx >= 0) {
			contractees[idx] = saved;
		} else {
			contractees.unshift(saved);
		}
	}

	async function handleDeleteContractee(c: Contractee) {
		if (!c.id) return;
		if (!confirm(`Delete recommender: "${c.name}"?`)) return;

		try {
			const res = await fetch(`/contracts/api/contractees?id=${c.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message || 'Error deleting contractee');
			contractees = contractees.filter((item) => item.id !== c.id);
			addToast('Contractee deleted.', 'success');
		} catch (err: any) {
			addToast(err?.message || 'Failed to delete contractee.', 'danger');
		}
	}

	function handleEnvelopeSent(sent: SentEnvelope) {
		envelopes.unshift(sent);
		activeView = 'envelopes';
		activeFilter = 'all';
	}

	async function checkEnvelopeStatus(env: SentEnvelope) {
		const id = env.envelopeId || env.id;
		if (!id) return;

		syncingIds[id] = true;
		try {
			const res = await fetch(`/contracts/api/envelopes/${id}/status`, { method: 'GET' });
			const result = await res.json();
			if (!res.ok || !result.success) {
				throw new Error(result.message || 'Failed to sync status from DocuSign');
			}

			const updated = result.envelope;
			const idx = envelopes.findIndex((e) => e.envelopeId === env.envelopeId || e.id === env.id);
			if (idx >= 0) {
				envelopes[idx] = { ...envelopes[idx], ...updated };
			}
			addToast(`Status updated: ${updated.status?.toUpperCase()}`, 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error syncing status.', 'danger');
		} finally {
			syncingIds[id] = false;
		}
	}

	async function resendEnvelope(env: SentEnvelope) {
		const id = env.envelopeId || env.id;
		if (!id) return;
		if (!confirm(`Resend DocuSign signing invitation to: ${env.receiver?.name}?`)) return;

		resendingIds[id] = true;
		try {
			const res = await fetch(`/contracts/api/envelopes/${id}/resend`, { method: 'POST' });
			const result = await res.json();
			if (!res.ok || !result.success) {
				throw new Error(result.message || 'Failed to resend invitation');
			}
			addToast('DocuSign invitation notification resent!', 'success');
		} catch (err: any) {
			console.error(err);
			addToast(err?.message || 'Error resending invitation.', 'danger');
		} finally {
			resendingIds[id] = false;
		}
	}

	function viewEnvelopeText(env: SentEnvelope) {
		previewEnvelopeText = {
			title: `${env.contractTitle} - ${env.receiver?.name}`,
			text: env.plainText || 'No plain-text version available.'
		};
		showTextModal = true;
	}

	function isSignedStatus(status?: string): boolean {
		const s = status?.toLowerCase();
		return s === 'completed' || s === 'signed';
	}
</script>

<svelte:head>
	<title>DocuSign Contracts & Recommender Tracking | EISG</title>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</svelte:head>

<Toasts />

<div class="dashboard-wrapper">
	<!-- TOP APP BRANDING & STATUS HEADER -->
	<EisgTopbar badgeText="DOCUSIGN" subtitle="Bilingual Contract Dispatch &amp; Recommender Quota Engine">
		<div class="btn-group btn-group-sm shadow-xs rounded-pill p-1 bg-slate-100 border" role="group" aria-label="View toggle">
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {activeView === 'templates' ? 'btn-primary' : 'text-secondary hover-dark'}" onclick={() => (activeView = 'templates')}>
				<UIcon name="file" size="6" class="me-1" />
				Templates ({contracts.length})
			</button>
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {activeView === 'envelopes' ? 'btn-primary' : 'text-secondary hover-dark'}" onclick={() => (activeView = 'envelopes')}>
				<UIcon name="paper-plane" size="6" class="me-1" />
				Envelopes ({envelopes.length})
			</button>
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {activeView === 'contractees' ? 'btn-primary' : 'text-secondary hover-dark'}" onclick={() => (activeView = 'contractees')}>
				<UIcon name="users-alt" size="6" class="me-1" />
				Contractees ({contractees.length})
			</button>
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {activeView === 'contractors' ? 'btn-primary' : 'text-secondary hover-dark'}" onclick={() => (activeView = 'contractors')}>
				<UIcon name="building" size="6" class="me-1" />
				Companies ({contractors.length})
			</button>
		</div>
	</EisgTopbar>

	<div class="container-fluid px-4 py-4 max-w-1600">
		<!-- PAGE TITLE & SUBTITLE -->
		<div class="row align-items-center mb-4 g-3">
			<div class="col-lg-8">
				<div class="d-flex flex-wrap align-items-center gap-2 mb-1">
					<h1 class="h3 fw-bold text-slate-900 mb-0">Recommender Contracts &amp; Envelopes</h1>
					<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 text-xs fw-semibold d-inline-flex align-items-center">
						<UIcon name="clock" size="6" /><span class="ms-1.5">150 PLN Provision / 30-Day Rule</span>
					</span>
					<span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 text-xs fw-semibold"> DocuSign eSignature &bull; SMS / Email </span>
				</div>
				<p class="text-secondary small mb-0">Automated dual-language contract generator (PL/EN), NIP company lookup, mobile SMS signing via DocuSign anchor tabs, and Bitrix24 contact payout synchronization.</p>
			</div>

			<div class="col-lg-4 d-flex justify-content-lg-end align-items-center gap-2">
				{#if contracts.length > 0}
					<button type="button" class="btn btn-primary btn-sm d-flex align-items-center px-3 py-2 rounded-3 shadow-xs" onclick={() => openSendContract(contracts[0])}>
						<UIcon name="paper-plane" size="6" />
						<span class="ms-2 fw-semibold text-xs">Dispatch Contract</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- 4 KPI SUMMARY STATS CARDS -->
		<div class="row g-3 mb-4">
			<!-- Card 1: Tracked Envelopes -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Total number of contracts dispatched to recommenders via DocuSign eSignature multi-channel." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Dispatched Envelopes</span>
								<div class="stat-icon-wrapper bg-blue-subtle text-primary">
									<UIcon name="envelope" size="5" />
								</div>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{totalEnvelopesCount}</span>
									<span class="text-secondary small fw-medium">Envelopes</span>
								</div>
								<div class="stat-footer mt-1 text-secondary d-flex align-items-center">
									<UIcon name="info" size="6" />
									<span class="ms-1.5">
										<strong class="text-slate-800">{smsDeliveryCount}</strong> via SMS &bull; <strong class="text-slate-800">{emailDeliveryCount}</strong> via Email
									</span>
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 2: Signed & Completed -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Legally signed contracts by both EISG and recommender via DocuSign anchor tabs (\s1\ and \s2\)." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Signed &amp; Approved</span>
								<span class="badge rounded-pill bg-success-subtle text-success fw-bold text-xs px-2.5 py-1">
									{successRate}% Signed
								</span>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-1">
									<span class="stat-value text-slate-900">{signedCount}</span>
									<span class="text-secondary fs-6 fw-medium">/ {totalEnvelopesCount} Executed</span>
								</div>
								<div class="progress mt-2 rounded-pill stat-progress">
									<div class="progress-bar bg-success rounded-pill" role="progressbar" style="width: {successRate}%" aria-valuenow={parseFloat(successRate)} aria-valuemin={0} aria-valuemax={100}></div>
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 3: Pending Signatures -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Envelopes currently sent or delivered to recommenders that are awaiting mobile or email signature." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Pending Signatures</span>
								<div class="stat-icon-wrapper bg-rose-subtle text-danger">
									<UIcon name="clock" size="5" />
								</div>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{pendingCount}</span>
									<span class="text-secondary small fw-medium">Awaiting Sign</span>
								</div>
								<div class="stat-footer mt-1 text-secondary">Live status polling enabled via DocuSign Webhooks</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 4: Provision Forecast -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Calculated recommendation quota provision. Signed contracts generate 150 PLN provision after candidate reaches 30 days." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Provision Forecast</span>
								<span class="badge rounded-pill bg-success-subtle text-success fw-bold text-xs px-2.5 py-1"> 150 PLN / Candidate </span>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{provisionForecastPLN} PLN</span>
								</div>
								<div class="stat-footer mt-1 text-secondary d-flex align-items-center gap-1">
									<UIcon name="check-circle" size="6" class="text-success" />
									<span><strong class="text-slate-800">{bitrixLinkedCount}</strong> Bitrix contacts synchronized</span>
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>
		</div>

		<!-- MAIN DASHBOARD SPLIT VIEW -->
		<div class="row g-4">
			<!-- LEFT COLUMN: SIDEBAR NAVIGATION & CRITERIA -->
			<div class="col-md-5 col-lg-4 col-xl-3">
				<div class="card period-sidebar-card shadow-xs border-slate-200 mb-3">
					<div class="card-header bg-white py-3 px-3 border-bottom border-slate-200">
						<div class="d-flex align-items-center justify-content-between">
							<div class="d-flex align-items-center">
								<UIcon name="filter" size="5" class="text-primary" />
								<span class="ms-2 fw-bold text-xs tracking-wider text-slate-800 text-uppercase">Navigation &amp; Views</span>
							</div>
							<span class="badge bg-slate-100 text-slate-600 border rounded-pill px-2 py-0.5 text-2xs text-capitalize">
								{activeView}
							</span>
						</div>

						<!-- Filter search input -->
						<div class="period-search-box mt-2.5 position-relative">
							<i class="fi fi-rr-search position-absolute text-muted period-search-icon"></i>
							<input type="text" class="form-control form-control-sm ps-4 rounded-3 text-xs border-slate-200 bg-slate-50" placeholder="Search..." bind:value={searchFilter} />
						</div>
					</div>

					<div class="card-body p-2 period-scroll-container">
						<div class="list-group list-group-flush gap-1">
							<!-- Item 1: Contract Templates -->
							<button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded-3 px-2.5 py-2 border-0 period-item-btn {activeView === 'templates' ? 'active-period' : ''}" onclick={() => (activeView = 'templates')}>
								<div class="d-flex align-items-center gap-2 text-truncate">
									<span class="period-dot {activeView === 'templates' ? 'bg-white' : 'bg-primary'}"></span>
									<span class="period-name text-xs fw-medium text-truncate {activeView === 'templates' ? 'text-white fw-bold' : 'text-slate-700'}"> Contract Templates </span>
								</div>
								<span class="badge rounded-pill {activeView === 'templates' ? 'bg-white text-primary fw-bold' : 'bg-primary-subtle text-primary'} text-2xs px-2 py-0.5">
									{contracts.length}
								</span>
							</button>

							<!-- Item 2: All Envelopes -->
							<button
								type="button"
								class="list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded-3 px-2.5 py-2 border-0 period-item-btn {activeView === 'envelopes' && activeFilter === 'all' ? 'active-period' : ''}"
								onclick={() => {
									activeView = 'envelopes';
									activeFilter = 'all';
								}}
							>
								<div class="d-flex align-items-center gap-2 text-truncate">
									<span class="period-dot {activeView === 'envelopes' && activeFilter === 'all' ? 'bg-white' : 'bg-dark'}"></span>
									<span class="period-name text-xs fw-medium text-truncate {activeView === 'envelopes' && activeFilter === 'all' ? 'text-white fw-bold' : 'text-slate-700'}"> Sent Envelopes </span>
								</div>
								<span class="badge rounded-pill {activeView === 'envelopes' && activeFilter === 'all' ? 'bg-white text-primary fw-bold' : 'bg-slate-100 text-slate-700'} text-2xs px-2 py-0.5">
									{envelopes.length}
								</span>
							</button>

							<!-- Item 3: Contractees / Recommenders -->
							<button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded-3 px-2.5 py-2 border-0 period-item-btn {activeView === 'contractees' ? 'active-period' : ''}" onclick={() => (activeView = 'contractees')}>
								<div class="d-flex align-items-center gap-2 text-truncate">
									<span class="period-dot {activeView === 'contractees' ? 'bg-white' : 'bg-info'}"></span>
									<span class="period-name text-xs fw-medium text-truncate {activeView === 'contractees' ? 'text-white fw-bold' : 'text-slate-700'}"> Contractees (Signers) </span>
								</div>
								<span class="badge rounded-pill {activeView === 'contractees' ? 'bg-white text-primary fw-bold' : 'bg-info-subtle text-info'} text-2xs px-2 py-0.5">
									{contractees.length}
								</span>
							</button>

							<!-- Item 4: Contractor Companies -->
							<button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded-3 px-2.5 py-2 border-0 period-item-btn {activeView === 'contractors' ? 'active-period' : ''}" onclick={() => (activeView = 'contractors')}>
								<div class="d-flex align-items-center gap-2 text-truncate">
									<span class="period-dot {activeView === 'contractors' ? 'bg-white' : 'bg-success'}"></span>
									<span class="period-name text-xs fw-medium text-truncate {activeView === 'contractors' ? 'text-white fw-bold' : 'text-slate-700'}"> Contractor Companies </span>
								</div>
								<span class="badge rounded-pill {activeView === 'contractors' ? 'bg-white text-primary fw-bold' : 'bg-success-subtle text-success'} text-2xs px-2 py-0.5">
									{contractors.length}
								</span>
							</button>
						</div>
					</div>
				</div>

				<!-- RECRUITER QUICK FILTER -->
				{#if Object.keys(recruiterOptions).length > 0}
					<div class="card period-sidebar-card shadow-xs border-slate-200 mb-3">
						<div class="card-header bg-white py-2.5 px-3 border-bottom border-slate-200">
							<span class="fw-bold text-xs tracking-wider text-slate-800 text-uppercase d-flex align-items-center gap-1.5">
								<UIcon name="users-alt" size="6" />
								<span>Filter by Recruiter</span>
							</span>
						</div>
						<div class="card-body p-2" style="max-height: 200px; overflow-y: auto;">
							<div class="list-group list-group-flush gap-1">
								<button type="button" class="list-group-item list-group-item-action py-1.5 px-2.5 rounded-3 border-0 text-xs {selectedRecruiterFilter === 'all' ? 'active-period text-white fw-bold' : 'text-slate-700'}" onclick={() => (selectedRecruiterFilter = 'all')}> All Recruiters </button>
								{#each Object.entries(recruiterOptions) as [rId, rName] (rId)}
									<button type="button" class="list-group-item list-group-item-action py-1.5 px-2.5 rounded-3 border-0 text-xs text-truncate {selectedRecruiterFilter === rId ? 'active-period text-white fw-bold' : 'text-slate-700'}" onclick={() => (selectedRecruiterFilter = rId)} title={rName}>
										{rName}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- CRITERIA HELPER CARD -->
				<div class="card info-criteria-card border-primary-subtle bg-primary-subtle shadow-xs p-3 rounded-3 mb-3">
					<div class="d-flex">
						<div class="text-primary mt-0.5">
							<UIcon name="info" size="6" />
						</div>
						<div class="ms-2">
							<div class="fw-bold text-xs text-primary-emphasis mb-1">Recommender Program Terms</div>
							<div class="text-xs text-slate-600 line-height-14">
								Recommenders earn <strong>150 PLN</strong> per successfully hired candidate once the candidate reaches <strong>30 worked days</strong>. Once the DocuSign contract is signed, Bitrix automatically logs the completion in the contact's timeline.
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- RIGHT COLUMN: MAIN CONTENT VIEW -->
			<div class="col-md-7 col-lg-8 col-xl-9">
				<!-- VIEW 1: ENVELOPES (DISPATCHED CONTRACTS) -->
				{#if activeView === 'envelopes'}
					<div in:fly={{ y: -20 }}>
						<div class="card recruiter-group-card shadow-xs border-slate-200 rounded-3 overflow-hidden">
							<!-- Card Header -->
							<div class="card-header bg-white p-3 p-md-3.5 border-bottom border-slate-200">
								<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
									<div class="d-flex align-items-center gap-3">
										<span class="status-pulse-dot bg-success flex-shrink-0"></span>
										<div>
											<div class="d-flex align-items-center gap-2 flex-wrap">
												<h2 class="h5 fw-bold text-slate-900 mb-0">Sent DocuSign Envelopes</h2>
												<span class="badge bg-slate-100 text-slate-700 border rounded-pill px-2.5 py-0.5 text-xs fw-medium">
													{filteredEnvelopes.length} of {envelopes.length} Envelopes
												</span>
												{#if selectedRecruiterFilter !== 'all'}
													<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5 text-2xs">
														Recruiter: {recruiterOptions[selectedRecruiterFilter] || selectedRecruiterFilter}
													</span>
												{/if}
											</div>
										</div>
									</div>

									<div class="d-flex align-items-center gap-2 flex-wrap">
										<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-1.5 text-xs fw-bold d-inline-flex align-items-center gap-1.5">
											<UIcon name="check-circle" size="6" />
											<span>{signedCount} Signed</span>
										</span>

										<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-1.5 text-xs fw-bold d-inline-flex align-items-center gap-1.5">
											<UIcon name="clock" size="6" />
											<span>{pendingCount} Pending</span>
										</span>
									</div>
								</div>

								<!-- Toolbar Filters & Search -->
								<div class="px-2 py-2 bg-slate-50 rounded-3 border border-slate-200 d-flex flex-wrap align-items-center justify-content-between gap-2">
									<div class="position-relative recruiter-table-search">
										<i class="fi fi-rr-search position-absolute text-muted table-search-icon"></i>
										<input type="text" class="form-control form-control-sm ps-4 rounded-3 text-xs bg-white border-slate-200" placeholder="Search recommender, phone, Bitrix ID..." bind:value={searchFilter} />
									</div>

									<div class="d-flex align-items-center gap-2 flex-wrap">
										<span class="text-xs text-secondary fw-semibold me-1">Status:</span>
										<div class="btn-group btn-group-sm shadow-xs rounded-pill p-0.5 bg-white border gap-1" role="group">
											<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'all' ? 'btn-primary' : 'btn-light text-secondary'}" onclick={() => (activeFilter = 'all')}>
												All ({envelopes.length})
											</button>
											<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'signed' ? 'btn-success text-white' : 'btn-light text-secondary'}" onclick={() => (activeFilter = 'signed')}>
												Signed ({signedCount})
											</button>
											<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'pending' ? 'btn-warning text-white' : 'btn-light text-secondary'}" onclick={() => (activeFilter = 'pending')}>
												Pending ({pendingCount})
											</button>
										</div>
									</div>
								</div>
							</div>

							<!-- Envelopes Data Table -->
							{#if filteredEnvelopes.length === 0}
								<div class="p-5 text-center bg-white">
									<div class="empty-icon-box mx-auto mb-3 text-slate-400">
										<UIcon name="inbox" size="3" />
									</div>
									<h5 class="fw-bold text-slate-800 mb-1">No sent contracts found</h5>
									<p class="text-secondary small mb-3">No DocuSign contracts match the selected filter criteria.</p>
									{#if contracts.length > 0}
										<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5" onclick={() => openSendContract(contracts[0])}>
											<UIcon name="paper-plane" size="6" class="me-1" />
											Send First Contract
										</button>
									{/if}
								</div>
							{:else}
								<div class="table-responsive bg-white">
									<table class="table align-middle mb-0 custom-contacts-table">
										<thead>
											<tr>
												<th class="ps-3 cursor-pointer user-select-none hover-dark" style="width: 110px;" onclick={() => toggleSort('date')}>
													<div class="d-flex align-items-center gap-1">
														DISPATCHED
														{#if sortColumn === 'date'}
															<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
														{/if}
													</div>
												</th>
												<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('name')}>
													<div class="d-flex align-items-center gap-1">
														RECOMMENDER (RECIPIENT)
														{#if sortColumn === 'name'}
															<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
														{/if}
													</div>
												</th>
												<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('contract')}>
													<div class="d-flex align-items-center gap-1">
														CONTRACT TEMPLATE
														{#if sortColumn === 'contract'}
															<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
														{/if}
													</div>
												</th>
												<th class="text-center" style="width: 140px;">PAYOUT</th>
												<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 130px;" onclick={() => toggleSort('status')}>
													<div class="d-flex align-items-center justify-content-center gap-1">
														STATUS
														{#if sortColumn === 'status'}
															<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
														{/if}
													</div>
												</th>
												<th class="text-end pe-3" style="width: 180px;">ACTIONS</th>
											</tr>
										</thead>
										<tbody>
											{#each filteredEnvelopes as env (env.envelopeId || env.id)}
												{@const isSigned = isSignedStatus(env.status)}
												{@const isExpanded = !!expandedEnvelopes[env.envelopeId || env.id || '']}
												{@const envKey = env.envelopeId || env.id || ''}

												<tr class={isSigned ? 'row-normal' : 'row-warning-light'}>
													<!-- Dispatched Date -->
													<td class="ps-3 text-secondary text-xs">
														<div class="fw-semibold text-slate-800">{dayjs(env.createdAt).format('DD.MM.YYYY')}</div>
														<div class="text-muted text-2xs">{dayjs(env.createdAt).format('HH:mm')}</div>
													</td>

													<!-- Recommender Name & Avatar -->
													<td>
														<div class="d-flex align-items-center gap-2.5 py-1">
															<ContactAvatar name={env.receiver?.name || ''} size={36} />
															<div>
																<div class="d-flex align-items-center gap-1.5">
																	<span class="fw-bold text-slate-900 text-sm">{env.receiver?.name || 'Unnamed Recommender'}</span>
																	{#if env.bitrixContactId}
																		<a href="{CONTACT_BASE_URL}{env.bitrixContactId}/" target="_blank" rel="noopener noreferrer" class="badge bg-primary-subtle text-primary border border-primary-subtle text-2xs text-decoration-none" title="Open in Bitrix24">
																			Bitrix #{env.bitrixContactId}
																		</a>
																	{/if}
																</div>
																<div class="text-secondary text-2xs mt-0.5 d-flex align-items-center gap-2">
																	{#if env.receiver?.phone}
																		<span><UIcon name="phone-call" size="7" class="me-1" />{env.receiver.phone}</span>
																	{/if}
																	{#if env.receiver?.email}
																		<span><UIcon name="envelope" size="7" class="me-1" />{env.receiver.email}</span>
																	{/if}
																	<span class="badge {env.receiver?.deliveryMethod === 'SMS' ? 'bg-info-subtle text-info border' : 'bg-slate-100 text-slate-600'} text-2xs px-1.5 py-0">
																		{env.receiver?.deliveryMethod === 'SMS' ? 'SMS' : 'Email'}
																	</span>
																</div>
															</div>
														</div>
													</td>

													<!-- Contract Template -->
													<td>
														<div class="fw-semibold text-slate-800 text-xs">{env.contractTitle}</div>
														<div class="d-flex align-items-center gap-1.5 mt-0.5">
															<span class="badge rounded-pill bg-purple-subtle text-purple border border-purple-subtle px-2 py-0 text-2xs fw-bold"> 🇵🇱 / 🇬🇧 Bilingual </span>
															{#if env.recruiterName}
																<span class="text-secondary text-2xs">Recruiter: <strong>{env.recruiterName}</strong></span>
															{/if}
														</div>
													</td>

													<!-- Payout Method -->
													<td class="text-center">
														{#if env.paymentMethod === 'bank'}
															<span class="badge rounded-pill bg-slate-100 text-primary border px-2 py-0.5 text-2xs fw-bold d-inline-flex align-items-center gap-1">
																<UIcon name="bank" size="7" />
																<span>Bank Transfer</span>
															</span>
															{#if env.bankAccount}
																<div class="text-muted text-2xs font-monospace mt-0.5 text-truncate" style="max-width: 140px;">
																	{env.bankAccount}
																</div>
															{/if}
														{:else}
															<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5 text-2xs fw-bold d-inline-flex align-items-center gap-1">
																<UIcon name="money" size="7" />
																<span>Cash</span>
															</span>
														{/if}
													</td>

													<!-- Status Badge -->
													<td class="text-center">
														{#if isSigned}
															<span class="badge rounded-pill bg-success text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																<UIcon name="check" size="7" /><span class="ms-1.5">Signed</span>
															</span>
															{#if env.signedAt}
																<div class="text-muted text-2xs mt-0.5">
																	{dayjs(env.signedAt).format('DD.MM.YY')}
																</div>
															{/if}
														{:else if env.status?.toLowerCase() === 'delivered'}
															<span class="badge rounded-pill bg-info text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																<UIcon name="eye" size="7" /><span class="ms-1.5">Delivered</span>
															</span>
														{:else if env.status?.toLowerCase() === 'declined' || env.status?.toLowerCase() === 'voided'}
															<span class="badge rounded-pill bg-danger text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																<UIcon name="cross" size="7" /><span class="ms-1.5">Declined</span>
															</span>
														{:else}
															<span class="badge rounded-pill bg-warning text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																<UIcon name="clock" size="7" /><span class="ms-1.5">Sent</span>
															</span>
														{/if}
													</td>

													<!-- Actions Button Group -->
													<td class="text-end pe-3">
														<div class="d-flex align-items-center justify-content-end gap-1">
															<button type="button" class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-xs text-slate-700 hover-shadow" title="Poll DocuSign API for current status" onclick={() => checkEnvelopeStatus(env)} disabled={syncingIds[envKey]}>
																{#if syncingIds[envKey]}
																	<span class="spinner-border spinner-border-sm"></span>
																{:else}
																	<UIcon name="refresh" size="7" />
																{/if}
															</button>

															<button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 text-xs hover-shadow" title="Resend signing invitation notification" onclick={() => resendEnvelope(env)} disabled={resendingIds[envKey] || isSigned}>
																{#if resendingIds[envKey]}
																	<span class="spinner-border spinner-border-sm"></span>
																{:else}
																	<UIcon name="paper-plane" size="7" />
																{/if}
															</button>

															<button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 text-xs fw-semibold hover-shadow d-inline-flex align-items-center gap-1 {isExpanded ? 'active-deal-btn' : ''}" onclick={() => toggleExpandEnvelope(envKey)}>
																<span class="me-1">{isExpanded ? 'Hide' : 'Details'}</span>
																<UIcon name={isExpanded ? 'angle-up' : 'angle-down'} size="7" />
															</button>
														</div>
													</td>
												</tr>

												<!-- Nested Detail Panel -->
												{#if isExpanded}
													<tr class="deals-expanded-row">
														<td colspan="6" class="p-3 bg-slate-50">
															<div class="card deals-detail-panel shadow-xs border-indigo-subtle rounded-3 overflow-hidden">
																<div class="card-header bg-white py-2.5 px-3 border-bottom border-indigo-subtle d-flex flex-wrap align-items-center justify-content-between gap-2">
																	<div class="d-flex align-items-center">
																		<UIcon name="briefcase" size="6" class="text-primary" />
																		<span class="ms-2 fw-bold text-xs tracking-wider text-slate-800 text-uppercase">
																			ENVELOPE DISPATCH DETAILS FOR <span class="text-primary">{env.receiver?.name}</span>
																		</span>
																	</div>
																	<div class="text-xs text-secondary">
																		DocuSign ID: <code class="text-slate-800 fw-bold">{env.envelopeId}</code> | Provision:
																		<strong class={isSigned ? 'text-success' : 'text-warning'}>
																			{isSigned ? '150 PLN Qualified' : 'Pending Signing'}
																		</strong>
																	</div>
																</div>

																<div class="card-body p-3 bg-white">
																	<div class="row g-3">
																		<div class="col-md-6">
																			<div class="p-2.5 bg-slate-50 rounded-3 border border-slate-200">
																				<div class="text-xs fw-bold text-slate-700 text-uppercase mb-1.5">Signer &amp; Delivery Information</div>
																				<div class="text-xs text-slate-600 line-height-14">
																					<div><strong>Signer:</strong> {env.receiver?.name}</div>
																					<div><strong>Phone:</strong> {env.receiver?.phone || 'Not provided'}</div>
																					<div><strong>Email:</strong> {env.receiver?.email || 'Not provided'}</div>
																					<div><strong>Method:</strong> {env.receiver?.deliveryMethod === 'SMS' ? 'SMS Mobile Signing' : 'Email Signing'}</div>
																					{#if env.bitrixContactId}
																						<div class="mt-1">
																							<strong>Bitrix Contact:</strong>
																							<a href="{CONTACT_BASE_URL}{env.bitrixContactId}/" target="_blank" class="fw-bold text-primary text-decoration-none ms-1">
																								Open Profile #{env.bitrixContactId} &rarr;
																							</a>
																						</div>
																					{/if}
																				</div>
																			</div>
																		</div>

																		<div class="col-md-6">
																			<div class="p-2.5 bg-slate-50 rounded-3 border border-slate-200">
																				<div class="text-xs fw-bold text-slate-700 text-uppercase mb-1.5">Payout &amp; Quota Assignment</div>
																				<div class="text-xs text-slate-600 line-height-14">
																					<div><strong>Payment:</strong> {env.paymentMethod === 'bank' ? `Bank Transfer (${env.bankAccount || 'Account on file'})` : 'Cash Payout'}</div>
																					<div><strong>Recruiter:</strong> {env.recruiterName || (env.recruiterId && recruiterOptions[env.recruiterId]) || 'Unassigned'}</div>
																					<div><strong>Dispatched:</strong> {dayjs(env.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
																					{#if env.signedAt}
																						<div class="text-success fw-bold"><strong>Signed At:</strong> {dayjs(env.signedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
																					{/if}
																					<div class="mt-2">
																						<button type="button" class="btn btn-xs btn-outline-info rounded-pill px-2.5 py-1 text-2xs fw-bold d-inline-flex align-items-center gap-1" onclick={() => viewEnvelopeText(env)}>
																							<UIcon name="eye" size="7" />
																							<span>View Contract Plain-Text Body</span>
																						</button>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
														</td>
													</tr>
												{/if}
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- VIEW 2: TEMPLATES -->
				{#if activeView === 'templates'}
					<div in:fly={{ y: -20 }}>
						<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
							<div class="d-flex align-items-center gap-3">
								<span class="status-pulse-dot bg-primary flex-shrink-0"></span>
								<div>
									<h2 class="h5 fw-bold text-slate-900 mb-0">Contract Templates</h2>
									<p class="text-secondary small mb-0">Dual-language contract definitions used for generating dynamic DocuSign PDFs.</p>
								</div>
							</div>

							<div>
								<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5 shadow-xs d-inline-flex align-items-center gap-1" onclick={openCreateContract}>
									<UIcon name="plus" size="6" />
									<span>Add Template</span>
								</button>
							</div>
						</div>

						{#if filteredTemplates.length === 0}
							<div class="card border-slate-200 shadow-xs p-5 text-center bg-white rounded-3">
								<div class="empty-icon-box mx-auto mb-3 text-slate-400">
									<UIcon name="document" size="3" />
								</div>
								<h5 class="fw-bold text-slate-800 mb-1">No templates found</h5>
								<p class="text-secondary small mb-3">Create your first dual-language contract template to start sending to recommenders.</p>
								<div>
									<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5" onclick={openCreateContract}>
										<UIcon name="plus" size="6" class="me-1" />
										Create Template
									</button>
								</div>
							</div>
						{:else}
							<div class="d-flex flex-column gap-3">
								{#each filteredTemplates as contract (contract.id)}
									{@const isExpanded = !!expandedTemplates[contract.id || '']}
									{@const plParas = contract.plText ? contract.plText.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0) : []}
									{@const enParas = contract.enText ? contract.enText.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0) : []}

									<div class="card recruiter-group-card shadow-xs border-slate-200 rounded-3 overflow-hidden">
										<!-- Template Header -->
										<div class="card-header bg-white p-3 p-md-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom-0">
											<div class="d-flex align-items-center gap-3">
												<div class="stat-icon-wrapper bg-blue-subtle text-primary">
													<UIcon name="document" size="5" />
												</div>
												<div>
													<div class="d-flex align-items-center gap-2 flex-wrap">
														<h3 class="h6 fw-bold text-slate-900 mb-0">{contract.title}</h3>
														<div class="d-flex gap-1">
															{#if contract.plText}
																<span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 text-2xs fw-bold">
																	🇵🇱 PL ({plParas.length} §)
																</span>
															{/if}
															{#if contract.enText}
																<span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-2 py-0.5 text-2xs fw-bold">
																	🇬🇧 EN ({enParas.length} §)
																</span>
															{/if}
														</div>
													</div>
													{#if contract.description}
														<div class="text-secondary small mt-0.5">{contract.description}</div>
													{/if}
												</div>
											</div>

											<div class="d-flex align-items-center gap-2 flex-wrap">
												<button type="button" class="btn btn-sm btn-outline-info rounded-pill px-3 py-1.5 text-xs fw-semibold d-inline-flex align-items-center gap-1 shadow-xs" onclick={() => openPdfPreview(contract)}>
													<UIcon name="eye" size="6" />
													<span>Preview PDF</span>
												</button>

												<button type="button" class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 text-xs fw-semibold d-inline-flex align-items-center gap-1 shadow-xs" onclick={() => openSendContract(contract)}>
													<UIcon name="paper-plane" size="6" />
													<span>Send via DocuSign</span>
												</button>

												<button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1.5 text-xs hover-shadow" title="Edit Template" onclick={() => openEditContract(contract)}>
													<UIcon name="pencil" size="6" />
												</button>

												<button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1.5 text-xs hover-shadow" title="Delete Template" onclick={() => handleDeleteContract(contract)}>
													<UIcon name="trash" size="6" />
												</button>

												<button type="button" class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center p-2 text-slate-600 border hover-bg-slate-100" style="width: 34px; height: 34px;" onclick={() => toggleExpandTemplate(contract.id || '')} aria-label="Toggle details">
													<UIcon name={isExpanded ? 'angle-up' : 'angle-down'} size="6" class="m-0" />
												</button>
											</div>
										</div>

										<!-- Expandable Template Body using ContractRenderer -->
										{#if isExpanded}
											<div class="card-body p-3 border-top border-slate-200 bg-slate-50" transition:slide>
												<div class="row g-3">
													<!-- Polish Column -->
													<div class="col-md-6">
														<div class="bg-white rounded-3 border border-slate-200 p-3 h-100">
															<div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
																<span class="fw-bold text-xs text-slate-800 text-uppercase">
																	🇵🇱 Polish Version ({plParas.length} Paragraphs)
																</span>
															</div>
															{#if plParas.length === 0}
																<div class="text-muted text-xs italic py-3 text-center">No Polish text defined.</div>
															{:else}
																<div style="max-height: 280px; overflow-y: auto;">
																	<ContractRenderer paragraphs={plParas} />
																</div>
															{/if}
														</div>
													</div>

													<!-- English Column -->
													<div class="col-md-6">
														<div class="bg-white rounded-3 border border-slate-200 p-3 h-100">
															<div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
																<span class="fw-bold text-xs text-slate-800 text-uppercase">
																	🇬🇧 English Version ({enParas.length} Paragraphs)
																</span>
															</div>
															{#if enParas.length === 0}
																<div class="text-muted text-xs italic py-3 text-center">No English text defined.</div>
															{:else}
																<div style="max-height: 280px; overflow-y: auto;">
																	<ContractRenderer paragraphs={enParas} />
																</div>
															{/if}
														</div>
													</div>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- VIEW 3: CONTRACTEES (RECOMMENDERS / SIGNERS) -->
				{#if activeView === 'contractees'}
					<div in:fly={{ y: -20 }}>
						<div class="card recruiter-group-card shadow-xs border-slate-200 rounded-3 overflow-hidden">
							<div class="card-header bg-white p-3 p-md-3.5 border-bottom border-slate-200">
								<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
									<div class="d-flex align-items-center gap-3">
										<span class="status-pulse-dot bg-info flex-shrink-0"></span>
										<div>
											<h2 class="h5 fw-bold text-slate-900 mb-0">Contractees (Recommenders)</h2>
											<p class="text-secondary small mb-0">Party 2 signers directory linked to Bitrix recruiters &amp; envelope completion.</p>
										</div>
									</div>

									<div>
										<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5 shadow-xs d-inline-flex align-items-center gap-1" onclick={openCreateContractee}>
											<UIcon name="plus" size="6" />
											<span>Add Contractee</span>
										</button>
									</div>
								</div>
							</div>

							{#if filteredContractees.length === 0}
								<div class="p-5 text-center bg-white">
									<div class="empty-icon-box mx-auto mb-3 text-slate-400">
										<UIcon name="users-alt" size="3" />
									</div>
									<h5 class="fw-bold text-slate-800 mb-1">No contractees found</h5>
									<p class="text-secondary small mb-3">Save contractees to quickly dispatch recommendation contracts with prefilled payment &amp; Bitrix recruiter data.</p>
									<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5" onclick={openCreateContractee}>
										<UIcon name="user-add" size="6" class="me-1" />
										Create First Contractee
									</button>
								</div>
							{:else}
								<div class="table-responsive bg-white">
									<table class="table align-middle mb-0 custom-contacts-table">
										<thead>
											<tr>
												<th class="ps-3">RECOMMENDER NAME</th>
												<th>ASSIGNED RECRUITER</th>
												<th>CONTACT INFO</th>
												<th class="text-center">PAYOUT METHOD</th>
												<th class="text-center">SIGNING STATUS</th>
												<th class="text-end pe-3">ACTIONS</th>
											</tr>
										</thead>
										<tbody>
											{#each filteredContractees as c (c.id)}
												{@const cEnvelopes = getContracteeEnvelopes(c)}
												{@const signedC = cEnvelopes.filter((e) => isSignedStatus(e.status))}
												{@const pendingC = cEnvelopes.filter((e) => !isSignedStatus(e.status))}
												<tr>
													<!-- Name -->
													<td class="ps-3">
														<div class="d-flex align-items-center gap-2.5 py-1">
															<ContactAvatar name={c.name} size={36} />
															<div>
																<div class="fw-bold text-slate-900 text-sm">{c.name}</div>
																{#if c.bitrixContactId}
																	<a href="{CONTACT_BASE_URL}{c.bitrixContactId}/" target="_blank" rel="noopener noreferrer" class="badge bg-primary-subtle text-primary border border-primary-subtle text-2xs text-decoration-none mt-0.5">
																		Bitrix #{c.bitrixContactId}
																	</a>
																{/if}
															</div>
														</div>
													</td>

													<!-- Assigned Recruiter -->
													<td>
														{#if c.recruiterId && recruiterOptions[c.recruiterId]}
															<span class="badge rounded-pill bg-purple-subtle text-purple fw-semibold px-2.5 py-1 text-2xs border">
																{recruiterOptions[c.recruiterId]}
															</span>
														{:else if c.recruiterName}
															<span class="badge rounded-pill bg-slate-100 text-slate-700 fw-semibold px-2.5 py-1 text-2xs border">
																{c.recruiterName}
															</span>
														{:else}
															<span class="text-muted text-2xs italic">No Recruiter Assigned</span>
														{/if}
													</td>

													<!-- Contact Info -->
													<td>
														<div class="text-xs text-slate-700">
															{#if c.phone}
																<div><UIcon name="phone-call" size="7" class="me-1 text-muted" />{c.phone}</div>
															{/if}
															{#if c.email}
																<div><UIcon name="envelope" size="7" class="me-1 text-muted" />{c.email}</div>
															{/if}
															{#if !c.phone && !c.email}
																<span class="text-muted text-2xs">—</span>
															{/if}
														</div>
													</td>

													<!-- Payout Method -->
													<td class="text-center">
														{#if c.paymentMethod === 'bank'}
															<span class="badge rounded-pill bg-slate-100 text-primary border px-2 py-0.5 text-2xs fw-bold"> Bank Transfer </span>
															{#if c.bankAccount}
																<div class="text-muted text-2xs font-monospace mt-0.5 text-truncate" style="max-width: 140px;">
																	{c.bankAccount}
																</div>
															{/if}
														{:else}
															<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5 text-2xs fw-bold"> Cash </span>
														{/if}
													</td>

													<!-- Signing Status (Linked Envelopes) -->
													<td class="text-center">
														{#if signedC.length > 0}
															<span class="badge rounded-pill bg-success text-white px-2.5 py-1 text-2xs fw-bold shadow-xs d-inline-flex align-items-center gap-1">
																<UIcon name="check" size="7" />
																<span>Signed ({signedC.length})</span>
															</span>
														{:else if pendingC.length > 0}
															<span class="badge rounded-pill bg-warning text-white px-2.5 py-1 text-2xs fw-bold shadow-xs d-inline-flex align-items-center gap-1">
																<UIcon name="clock" size="7" />
																<span>Pending ({pendingC.length})</span>
															</span>
														{:else}
															<span class="badge rounded-pill bg-slate-100 text-slate-500 border px-2 py-0.5 text-2xs"> No Contract Sent </span>
														{/if}
													</td>

													<!-- Actions -->
													<td class="text-end pe-3">
														<div class="d-flex align-items-center justify-content-end gap-1">
															{#if contracts.length > 0}
																<button
																	type="button"
																	class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-1 text-xs fw-semibold hover-shadow d-inline-flex align-items-center gap-1"
																	title="Dispatch contract to this recommender"
																	onclick={() => {
																		sendingContract = contracts[0];
																		showSendModal = true;
																	}}
																>
																	<UIcon name="paper-plane" size="7" />
																	<span>Send</span>
																</button>
															{/if}

															<button type="button" class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-xs text-slate-700 hover-shadow" title="Edit Recommender" onclick={() => openEditContractee(c)}>
																<UIcon name="pencil" size="7" />
															</button>

															<button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 text-xs hover-shadow" title="Delete Recommender" onclick={() => handleDeleteContractee(c)}>
																<UIcon name="trash" size="7" />
															</button>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- VIEW 4: CONTRACTORS (COMPANIES) -->
				{#if activeView === 'contractors'}
					<div in:fly={{ y: -20 }}>
						<div class="card recruiter-group-card shadow-xs border-slate-200 rounded-3 overflow-hidden">
							<div class="card-header bg-white p-3 p-md-3.5 border-bottom border-slate-200">
								<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
									<div class="d-flex align-items-center gap-3">
										<span class="status-pulse-dot bg-success flex-shrink-0"></span>
										<div>
											<h2 class="h5 fw-bold text-slate-900 mb-0">Contractor Companies (Party 1)</h2>
											<p class="text-secondary small mb-0">Entities that dispatch contracts. Download company details automatically by NIP.</p>
										</div>
									</div>

									<div class="d-flex align-items-center gap-2">
										<button class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1.5 shadow-xs d-inline-flex align-items-center gap-1" onclick={() => (showQuickAddContractor = !showQuickAddContractor)}>
											<UIcon name={showQuickAddContractor ? 'cross' : 'plus'} size="6" />
											<span>{showQuickAddContractor ? 'Close Form' : 'Quick Add Company'}</span>
										</button>
										<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5 shadow-xs d-inline-flex align-items-center gap-1" onclick={openCreateContractor}>
											<UIcon name="plus" size="6" />
											<span>New Company Modal</span>
										</button>
									</div>
								</div>

								<!-- Quick Add Contractor Inline Form -->
								{#if showQuickAddContractor}
									<div class="p-3 bg-slate-50 border border-slate-200 rounded-3 mt-3" transition:slide>
										<div class="fw-bold text-xs text-slate-800 text-uppercase mb-2 d-flex align-items-center gap-1.5">
											<UIcon name="building" size="6" />
											<span>Add New Contractor Company</span>
										</div>
										<div class="row g-2">
											<div class="col-md-4">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickNip">NIP *</label>
												<div class="input-group input-group-sm">
													<input id="quickNip" type="text" class="form-control form-control-sm text-xs border-slate-200" placeholder="e.g. 5252637218" bind:value={newCompNip} />
													<button type="button" class="btn btn-outline-primary btn-sm px-2 text-2xs fw-bold" onclick={fetchQuickNip} disabled={isFetchingQuickNip || !newCompNip.trim()}>
														{#if isFetchingQuickNip}
															<span class="spinner-border spinner-border-sm"></span>
														{:else}
															<span>Fetch NIP</span>
														{/if}
													</button>
												</div>
											</div>
											<div class="col-md-5">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickName">Company Name *</label>
												<input id="quickName" type="text" class="form-control form-control-sm text-xs border-slate-200" placeholder="Legal company name" bind:value={newCompName} />
											</div>
											<div class="col-md-3">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickKrs">KRS</label>
												<input id="quickKrs" type="text" class="form-control form-control-sm text-xs border-slate-200" placeholder="0000000000" bind:value={newCompKrs} />
											</div>
											<div class="col-md-6">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickAddress">Registered Address *</label>
												<input id="quickAddress" type="text" class="form-control form-control-sm text-xs border-slate-200" placeholder="ul. Ulica 1, 00-000 Miasto" bind:value={newCompAddress} />
											</div>
											<div class="col-md-3">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickEmail">Email</label>
												<input id="quickEmail" type="email" class="form-control form-control-sm text-xs border-slate-200" placeholder="biuro@example.com" bind:value={newCompEmail} />
											</div>
											<div class="col-md-3">
												<label class="form-label text-2xs fw-bold text-slate-600 mb-0.5" for="quickPhone">Phone</label>
												<input id="quickPhone" type="tel" class="form-control form-control-sm text-xs border-slate-200" placeholder="+48 000 000 000" bind:value={newCompPhone} />
											</div>
											<div class="col-12 d-flex align-items-center justify-content-between pt-1">
												<div class="form-check form-switch">
													<input class="form-check-input" type="checkbox" role="switch" id="quickDefaultSwitch" bind:checked={newCompIsDefault} />
													<label class="form-check-label text-2xs fw-semibold text-slate-700" for="quickDefaultSwitch"> Set as default contractor company </label>
												</div>
												<div class="d-flex gap-2">
													<button type="button" class="btn btn-light btn-sm text-xs px-3" onclick={() => (showQuickAddContractor = false)}> Cancel </button>
													<button type="button" class="btn btn-success btn-sm text-xs px-4 fw-bold shadow-xs" onclick={saveQuickContractor} disabled={isSavingQuickContractor}>
														{#if isSavingQuickContractor}
															<span class="spinner-border spinner-border-sm me-1"></span>
														{/if}
														<span>Save Company</span>
													</button>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>

							{#if filteredContractors.length === 0}
								<div class="p-5 text-center bg-white">
									<div class="empty-icon-box mx-auto mb-3 text-slate-400">
										<UIcon name="building" size="3" />
									</div>
									<h5 class="fw-bold text-slate-800 mb-1">No contractor companies found</h5>
									<p class="text-secondary small mb-3">Add your company and fetch its legal details directly from the Ministry of Finance via NIP.</p>
									<button class="btn btn-primary btn-sm rounded-pill px-3 py-1.5" onclick={openCreateContractor}>
										<UIcon name="building" size="6" class="me-1" />
										Add Company
									</button>
								</div>
							{:else}
								<div class="table-responsive bg-white">
									<table class="table align-middle mb-0 custom-contacts-table">
										<thead>
											<tr>
												<th class="ps-3">COMPANY NAME</th>
												<th>NIP / REGON</th>
												<th>REGISTERED ADDRESS</th>
												<th class="text-center">DEFAULT</th>
												<th class="text-end pe-3">ACTIONS</th>
											</tr>
										</thead>
										<tbody>
											{#each filteredContractors as c (c.id || c.nip)}
												<tr>
													<!-- Company Name -->
													<td class="ps-3">
														<div class="fw-bold text-slate-900 text-sm">{c.name}</div>
														{#if c.krs}
															<span class="badge bg-slate-100 text-slate-600 border text-2xs mt-0.5">KRS: {c.krs}</span>
														{/if}
													</td>

													<!-- NIP & REGON -->
													<td>
														<div class="fw-semibold text-slate-800 text-xs font-monospace">NIP: {c.nip}</div>
														{#if c.regon}
															<div class="text-muted text-2xs font-monospace">REGON: {c.regon}</div>
														{/if}
													</td>

													<!-- Address -->
													<td>
														<div class="text-xs text-slate-700">{c.address}</div>
														{#if c.email}
															<div class="text-muted text-2xs">{c.email}</div>
														{/if}
													</td>

													<!-- Default Status -->
													<td class="text-center">
														{#if c.isDefault}
															<span class="badge rounded-pill bg-success text-white px-2.5 py-1 text-2xs fw-bold shadow-xs"> Default </span>
														{:else}
															<span class="text-muted text-2xs">—</span>
														{/if}
													</td>

													<!-- Actions -->
													<td class="text-end pe-3">
														<div class="d-flex align-items-center justify-content-end gap-1">
															<button type="button" class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-xs text-slate-700 hover-shadow" title="Edit Company" onclick={() => openEditContractor(c)}>
																<UIcon name="pencil" size="7" />
															</button>

															<button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 text-xs hover-shadow" title="Delete Company" onclick={() => handleDeleteContractor(c)}>
																<UIcon name="trash" size="7" />
															</button>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- GLOBAL COMPLIANCE STATUS BAR -->
	<footer class="py-3 px-4 bg-white border-top border-slate-200 w-100 shadow-sm" style="z-index: 1020;">
		<div class="container-fluid px-0 d-flex flex-wrap align-items-center justify-content-between gap-3 text-2xs text-secondary">
			<div class="d-flex align-items-center gap-2">
				<span>&copy; {dayjs().format('YYYY')} EISG</span>
				<span>&bull;</span>
				<span class="text-success fw-medium d-inline-flex align-items-center">
					<span class="status-dot-sm bg-success"></span><span class="ms-1.5">DocuSign API &amp; Webhook Service Operational</span>
				</span>
			</div>
			<div>
				Tracking Engine: <strong class="text-slate-700">{envelopes.length} Envelopes Dispatched</strong> &bull; {contractees.length} Contractees &bull; {contractors.length} Companies
			</div>
		</div>
	</footer>
</div>

<!-- Modal: Plaintext Document Viewer -->
<ClosableModal bind:isOpen={showTextModal} headerText={previewEnvelopeText.title} size="lg">
	<div class="p-3 bg-slate-50 border border-slate-200 rounded-3" style="white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 480px; overflow-y: auto;">
		{previewEnvelopeText.text}
	</div>
</ClosableModal>

<!-- Modal: Contract Editor -->
<ContractEditorModal bind:isOpen={showEditorModal} contract={editingContract} onSaved={handleContractSaved} />

<!-- Modal: Send Contract to DocuSign -->
<SendContractModal bind:isOpen={showSendModal} contract={sendingContract} {recruiterOptions} {contractors} {contractees} onSent={handleEnvelopeSent} />

<!-- Modal: Contractor Company (Party 1) -->
<ContractorModal bind:isOpen={showContractorModal} contractor={editingContractor} onSaved={handleContractorSaved} />

<!-- Modal: Contractee (Party 2) -->
<ContracteeModal bind:isOpen={showContracteeModal} contractee={editingContractee} {recruiterOptions} onSaved={handleContracteeSaved} />

<!-- Modal: Bilingual PDF Preview from Contracts List -->
<ContractPdfPreviewModal bind:isOpen={showPdfPreviewModal} contract={previewContract} {contractors} />
