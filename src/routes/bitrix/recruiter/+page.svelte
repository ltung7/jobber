<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { internal } from '$lib/nav/internal';
	import dayjs from 'dayjs';
	import DownloadRecruiterStats from './DownloadRecruiterStats.svelte';
	import TooltipText from '$lib/misc/TooltipText.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import ContactAvatar from '$lib/components/ContactAvatar.svelte';
	import EisgTopbar from '$lib/components/EisgTopbar.svelte';
	import Flatpickr from 'svelte-flatpickr';
	import 'flatpickr/dist/flatpickr.css';
	import { addToast } from '$lib/toast';
	import { fly, slide } from 'svelte/transition';

	const CONTACT_BASE_URL = 'https://eisg.bitrix24.pl/crm/contact/details/';
	const DEAL_BASE_URL = 'https://eisg.bitrix24.pl/crm/deal/details/';

	let { data } = $props();

	// Internal state for selected period and fetching (defaults to second last month: ready to calculate provision)
	let selectedYear = $state(untrack(() => data.selectedYear || dayjs().subtract(2, 'month').format('YYYY')));
	let selectedMonth = $state(untrack(() => data.selectedMonth || dayjs().subtract(2, 'month').format('MM')));
	let customFrom = $state<string | null>(null);
	let customTo = $state<string | null>(null);
	let isCustomRangeModalOpen = $state(false);
	let customRangeDates = $state<Date[]>([]);

	const flatpickrOptions = {
		mode: 'range' as const,
		inline: true,
		dateFormat: 'Y-m-d'
	};

	let contacts = $state<any[]>([]);
	let payouts = $state<any[]>(untrack(() => data.payouts || []));
	let loading = $state(true);
	let expandedRecruiters = $state<Record<string, boolean>>({});
	let expandedContacts = $state<Record<string, boolean>>({});
	let projectOptions = $state<Record<string, string>>(untrack(() => data.projectOptions || {}));

	// Payment modal state
	let isPaymentModalOpen = $state(false);
	let selectedRecruiterForPayment = $state<string>('');
	let payoutValue = $state<number>(0);
	let paymentNote = $state<string>('');
	let submittingPayment = $state(false);

	// Search and filter states
	let monthSearch = $state('');
	let recruiterSearch = $state<Record<string, string>>({});
	let recruiterStatusFilter = $state<Record<string, 'all' | 'passed' | 'failed'>>({});

	// Generate last 18 months array for the left sidebar navigation
	// Billing period label is shown +2 months forward (e.g. data for August 2026 is labeled October 2026)
	const allMonths = Array.from({ length: 18 }).map((_, i) => {
		const d = dayjs().subtract(i, 'month');
		const displayDate = d.add(2, 'month');
		let status: 'in-prep' | 'active' | 'ready' | 'archived' = 'archived';
		if (i === 0) status = 'in-prep';
		else if (i === 1) status = 'active';
		else if (i === 2) status = 'ready';

		return {
			label: displayDate.format('MMMM YYYY'),
			month: d.format('MM'),
			year: d.format('YYYY'),
			monthName: displayDate.format('MMMM'),
			status
		};
	});

	let filteredMonths = $derived(allMonths.filter((m) => m.label.toLowerCase().includes(monthSearch.trim().toLowerCase())));

	const selectedMonthObj = $derived(dayjs(`${selectedYear}-${selectedMonth}-01`));
	// Billing period shown is +2 months forward from the underlying data start month
	const selectedMonthLabel = $derived(customFrom ? `${dayjs(`${customFrom}-01`).add(2, 'month').format('MMM YYYY')} - ${dayjs(`${customTo}-01`).add(2, 'month').format('MMM YYYY')}` : selectedMonthObj.add(2, 'month').format('MMMM YYYY'));
	const evalPeriodStartLabel = $derived(customFrom ? dayjs(`${customFrom}-01`).startOf('month').format('MMM 01, YYYY') : selectedMonthObj.startOf('month').format('MMM 01, YYYY'));
	const evalPeriodEndLabel = $derived(customTo ? dayjs(`${customTo}-01`).endOf('month').format('MMM DD, YYYY') : selectedMonthObj.endOf('month').format('MMM DD, YYYY'));

	async function fetchAnalytics(year: string, month: string, from?: string | null, to?: string | null) {
		loading = true;
		try {
			const queryParams: any = {};
			if (from && to) {
				queryParams.from = from;
				queryParams.to = to;
			} else {
				queryParams.year = year;
				queryParams.month = month;
			}
			const response: any = await internal.getApi(queryParams);
			if (response && response.contacts) {
				contacts = response.contacts;
			} else {
				contacts = [];
			}
			if (response && response.payouts) {
				payouts = response.payouts;
			}
		} catch (err) {
			console.error('Failed to fetch recruiter analytics', err);
			contacts = [];
		} finally {
			loading = false;
		}
	}

	function selectMonth(year: string, month: string) {
		if (selectedYear === year && selectedMonth === month && !customFrom) return;
		selectedYear = year;
		selectedMonth = month;
		customFrom = null;
		customTo = null;
		fetchAnalytics(year, month);
	}

	function applyCustomRange(range: { from: string; to: string }) {
		// Use YYYY-MM format required by the backend and UI logic
		customFrom = dayjs(range.from).format('YYYY-MM');
		customTo = dayjs(range.to).format('YYYY-MM');

		// Reset single month selection to avoid UI confusion
		selectedYear = '';
		selectedMonth = '';
		fetchAnalytics('', '', customFrom, customTo);
	}

	function handleCustomDateChange(event: CustomEvent) {
		const [selectedDates] = event.detail;
		customRangeDates = selectedDates;
	}

	function confirmCustomRange() {
		if (customRangeDates.length === 2) {
			applyCustomRange({
				from: dayjs(customRangeDates[0]).format('YYYY-MM-DD'),
				to: dayjs(customRangeDates[1]).format('YYYY-MM-DD')
			});
			isCustomRangeModalOpen = false;
		}
	}

	function setQ3() {
		applyCustomRange({
			from: `${selectedYear || dayjs().format('YYYY')}-07-01`,
			to: `${selectedYear || dayjs().format('YYYY')}-09-30`
		});
	}

	function setYTD() {
		applyCustomRange({
			from: `${selectedYear || dayjs().format('YYYY')}-01-01`,
			to: `${selectedYear || dayjs().format('YYYY')}-12-31`
		});
	}

	function isRecruiterExpanded(recruiterId: string, index: number): boolean {
		if (expandedRecruiters[recruiterId] !== undefined) {
			return expandedRecruiters[recruiterId];
		}
		return index === 0;
	}

	function toggleExpandRecruiter(recruiterId: string, index: number) {
		const current = isRecruiterExpanded(recruiterId, index);
		expandedRecruiters[recruiterId] = !current;
	}

	function toggleExpandContact(contactId: string) {
		expandedContacts[contactId] = !expandedContacts[contactId];
	}

	// Trigger initial fetch when page mounts
	onMount(() => {
		fetchAnalytics(selectedYear, selectedMonth);
	});

	function isAssignedRecruiter(rId: string | undefined): boolean {
		if (!rId || rId === 'Unassigned' || rId === '1186' || rId === 'N/A') return false;
		const rName = data?.recruiterOptions ? data.recruiterOptions[rId] : undefined;
		if (rName === 'N/A') return false;
		return true;
	}

	// Aggregate data grouped by recruiter
	let aggregated = $derived.by(() => {
		const grouped: Record<string, any> = {};

		for (const contact of contacts) {
			let rId = contact.recruiterId;
			let rName = data?.recruiterOptions ? data.recruiterOptions[rId] : undefined;

			// Join "N/A" (or specific ID 1186) with "Unassigned"
			if (!rId || rId === 'Unassigned' || rId === '1186' || rName === 'N/A') {
				rId = 'Unassigned';
				rName = 'Unassigned / External Contractors';
			} else if (!rName) {
				rName = `Unknown (${rId})`;
			}

			if (!grouped[rId]) {
				grouped[rId] = {
					recruiterId: rId,
					recruiterName: rName,
					contacts: [],
					totalStarted: 0,
					totalSuccessful: 0
				};
			}

			grouped[rId].contacts.push(contact);
			grouped[rId].totalStarted++;
			if (contact.isSuccessful) {
				grouped[rId].totalSuccessful++;
			}
		}

		// Return sorted array (most successful first, but keep 'Unassigned' at the bottom)
		return Object.values(grouped).sort((a: any, b: any) => {
			if (a.recruiterId === 'Unassigned' && b.recruiterId !== 'Unassigned') return 1;
			if (b.recruiterId === 'Unassigned' && a.recruiterId !== 'Unassigned') return -1;
			return b.totalSuccessful - a.totalSuccessful || b.totalStarted - a.totalStarted;
		});
	});

	// High level metrics
	const assignedContacts = $derived(contacts.filter((c) => isAssignedRecruiter(c.recruiterId)));
	const totalContractors = $derived(assignedContacts.length);
	const unassignedCount = $derived(contacts.length - totalContractors);
	const assignedPercentage = $derived(contacts.length > 0 ? ((totalContractors / contacts.length) * 100).toFixed(1) : '0.0');
	// Only calculate totalPassed when recruiter is neither unassigned nor "N/A"
	const totalPassed = $derived(assignedContacts.filter((c) => c.isSuccessful).length);
	const passRate = $derived(totalContractors > 0 ? ((totalPassed / totalContractors) * 100).toFixed(1) : '0.0');
	const totalCumulativeDays = $derived(assignedContacts.reduce((sum, c) => sum + (c.totalWorkedDays || 0), 0));
	const avgDaysPerResource = $derived(totalContractors > 0 ? (totalCumulativeDays / totalContractors).toFixed(1) : '0.0');
	const provisionForecast = $derived((totalPassed * 150).toLocaleString('de-DE'));

	// Filter payouts for the active period window
	let periodPayouts = $derived(
		payouts.filter((p) => {
			if (customFrom && customTo) {
				const pDate = `${p.year}-${String(p.month).padStart(2, '0')}`;
				return pDate >= customFrom && pDate <= customTo;
			}
			return p.year === selectedYear && String(p.month).padStart(2, '0') === String(selectedMonth).padStart(2, '0');
		})
	);

	let totalPaidInPeriod = $derived(periodPayouts.reduce((sum, p) => sum + (Number(p.payoutValue) || 0), 0));

	// Eligible recruiters for payments (neither unassigned nor N/A)
	let eligibleRecruiters = $derived.by(() => {
		const list = aggregated.filter((g) => g.recruiterId !== 'Unassigned' && isAssignedRecruiter(g.recruiterId));
		const listIds = new Set(list.map((g) => g.recruiterId));

		if (data?.recruiterOptions) {
			for (const [id, name] of Object.entries(data.recruiterOptions)) {
				if (isAssignedRecruiter(id) && !listIds.has(id)) {
					list.push({
						recruiterId: id,
						recruiterName: name,
						contacts: [],
						totalStarted: 0,
						totalSuccessful: 0
					});
				}
			}
		}
		return list;
	});

	let selectedPaymentGroup = $derived(eligibleRecruiters.find((g) => g.recruiterId === selectedRecruiterForPayment));

	let selectedPaymentPassedContractors = $derived(selectedPaymentGroup ? selectedPaymentGroup.contacts.filter((c: any) => c.isSuccessful) : []);

	function openPaymentModal(recruiterId?: string) {
		const targetId = recruiterId || (eligibleRecruiters.length > 0 ? eligibleRecruiters[0].recruiterId : '');
		selectRecruiterForPayment(targetId);
		paymentNote = '';
		isPaymentModalOpen = true;
	}

	function selectRecruiterForPayment(recruiterId: string) {
		selectedRecruiterForPayment = recruiterId;
		const group = eligibleRecruiters.find((g) => g.recruiterId === recruiterId);
		const passedCount = group ? group.contacts.filter((c: any) => c.isSuccessful).length : 0;
		// calculate default based on passed contractor * 150
		payoutValue = passedCount * 150;
	}

	async function submitPayment() {
		if (!selectedRecruiterForPayment) {
			addToast('Please select a recruiter', 'warning');
			return;
		}
		if (payoutValue < 0) {
			addToast('Payout value must be a positive number', 'warning');
			return;
		}

		submittingPayment = true;
		const group = selectedPaymentGroup;
		const passed = selectedPaymentPassedContractors;

		const payload = {
			recruiterId: selectedRecruiterForPayment,
			recruiterName: group?.recruiterName || data?.recruiterOptions?.[selectedRecruiterForPayment] || '',
			payoutValue: Number(payoutValue),
			month: selectedMonth,
			year: selectedYear,
			includedContractors: passed.map((c: any) => ({
				id: c.id,
				name: c.name || '',
				days: c.totalWorkedDays || 0
			})),
			note: paymentNote.trim()
		};

		try {
			const response: any = await internal.postApi(payload);
			if (response && (response.success || response.id)) {
				addToast('Payment recorded successfully!', 'success');
				const savedItem = response.payout || { ...payload, id: response.id, createdAt: new Date().toISOString() };
				payouts = [savedItem, ...payouts];
				isPaymentModalOpen = false;
			} else {
				addToast(response?.error || 'Failed to record payment', 'danger');
			}
		} catch (err: any) {
			console.error('Failed to submit payment', err);
			addToast(err?.message || 'Error recording payment', 'danger');
		} finally {
			submittingPayment = false;
		}
	}

	let sortColumn = $state<string>('id');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	function toggleSort(col: string) {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = 'asc';
		}
	}

	function getFilteredContacts(group: any) {
		const search = (recruiterSearch[group.recruiterId] || '').trim().toLowerCase();
		const filter = recruiterStatusFilter[group.recruiterId] || 'all';

		let filtered = group.contacts.filter((c: any) => {
			if (filter === 'passed' && !c.isSuccessful) return false;
			if (filter === 'failed' && c.isSuccessful) return false;

			if (search) {
				const matchName = (c.name || '').toLowerCase().includes(search);
				const matchId = String(c.id).includes(search);
				return matchName || matchId;
			}
			return true;
		});

		filtered.sort((a: any, b: any) => {
			let valA, valB;
			switch (sortColumn) {
				case 'id':
					valA = parseInt(a.id);
					valB = parseInt(b.id);
					break;
				case 'name':
					valA = (a.name || '').toLowerCase();
					valB = (b.name || '').toLowerCase();
					break;
				case 'placement':
					valA = getPlacementName(a).toLowerCase();
					valB = getPlacementName(b).toLowerCase();
					break;
				case 'totalWorkedDays':
					valA = a.totalWorkedDays || 0;
					valB = b.totalWorkedDays || 0;
					break;
				case 'evalPeriodDays':
					valA = a.totalWorkedDaysEval || 0;
					valB = b.totalWorkedDaysEval || 0;
					break;
				case 'status':
					valA = a.isSuccessful ? 1 : 0;
					valB = b.isSuccessful ? 1 : 0;
					break;
				default:
					valA = parseInt(a.id);
					valB = parseInt(b.id);
			}

			if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
			if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}

	function getPlacementName(contact: any): string {
		if (contact.deals && contact.deals.length > 0) {
			const firstDeal = contact.deals[0];
			if (firstDeal.projectId && projectOptions[firstDeal.projectId]) {
				return projectOptions[firstDeal.projectId];
			}
			if (firstDeal.title) return firstDeal.title;
		}
		return 'Standard Assignment';
	}
</script>

<div class="dashboard-wrapper">
	<!-- TOP APP BRANDING & STATUS HEADER -->
	<EisgTopbar badgeText="BITRIX" badgeColor="purple" subtitle="Provision & Recruiter Quota Analytics Engine">
		<div class="btn-group btn-group-sm shadow-xs rounded-pill p-1 bg-slate-100 border" role="group" aria-label="Period quick range">
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold text-secondary hover-dark" onclick={setQ3}>Q3 {selectedYear || dayjs().format('YYYY')}</button>
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold text-secondary hover-dark" onclick={setYTD}>YTD {selectedYear || dayjs().format('YYYY')}</button>
			<button type="button" class="btn btn-sm rounded-pill px-3 py-1 text-xs fw-semibold {customFrom ? 'btn-primary' : 'text-secondary hover-dark'}" onclick={() => (isCustomRangeModalOpen = true)}>
				{#if customFrom}
					{dayjs(`${customFrom}-01`).format('MMM YY')} - {dayjs(`${customTo}-01`).format('MMM YY')}
				{:else}
					Custom Range
				{/if}
			</button>
		</div>
	</EisgTopbar>

	<ClosableModal bind:isOpen={isCustomRangeModalOpen} headerText="Select Date Range" size="md">
		<div class="d-flex flex-column align-items-center justify-content-center p-3">
			{#if isCustomRangeModalOpen}
				<Flatpickr options={flatpickrOptions} on:change={handleCustomDateChange} bind:value={customRangeDates} class="d-none" />
			{/if}
		</div>
		{#snippet footer()}
			<button class="btn btn-primary" onclick={confirmCustomRange} disabled={customRangeDates.length !== 2}> Apply Range </button>
		{/snippet}
	</ClosableModal>

	<ClosableModal bind:isOpen={isPaymentModalOpen} headerText="Add Recruiter Payment" size="lg">
		<div class="p-2">
			<div class="row g-3">
				<!-- Recruiter Select -->
				<div class="col-12 col-md-6">
					<label for="recruiterSelect" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
						Select Recruiter <span class="text-danger">*</span>
					</label>
					<select id="recruiterSelect" class="form-select form-select-sm rounded-3 text-xs border-slate-200" value={selectedRecruiterForPayment} onchange={(e) => selectRecruiterForPayment(e.currentTarget.value)}>
						<option value="" disabled>-- Select Recruiter --</option>
						{#each eligibleRecruiters as rec (rec.recruiterId)}
							<option value={rec.recruiterId}>
								{rec.recruiterName} ({rec.totalSuccessful} passed)
							</option>
						{/each}
					</select>
				</div>

				<!-- Payout Value Input -->
				<div class="col-12 col-md-6">
					<label for="payoutValueInput" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1">
						Payout Value (PLN) <span class="text-danger">*</span>
					</label>
					<div class="input-group input-group-sm">
						<span class="input-group-text bg-slate-100 text-slate-700 fw-bold border-slate-200">PLN</span>
						<input id="payoutValueInput" type="number" class="form-control form-control-sm text-xs border-slate-200" bind:value={payoutValue} min="0" step="50" placeholder="0" />
					</div>
					<div class="text-muted text-2xs mt-1">
						Default calculation: {selectedPaymentPassedContractors.length} passed &times; 150 PLN = {selectedPaymentPassedContractors.length * 150} PLN
					</div>
				</div>

				<!-- Target Billing Period Notice -->
				<div class="col-12">
					<div class="p-2.5 bg-slate-50 rounded-3 border border-slate-200 d-flex flex-wrap align-items-center justify-content-between gap-2 text-xs">
						<div>
							<span class="text-secondary">Target Billing Period:</span>
							<strong class="text-slate-800 ms-1">{selectedMonthLabel} ({selectedYear}-{selectedMonth})</strong>
						</div>
						<div>
							<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 text-2xs fw-semibold"> Quota Rate: 150 PLN / contractor </span>
						</div>
					</div>
				</div>

				<!-- Notes -->
				<div class="col-12">
					<label for="paymentNote" class="form-label text-xs fw-bold text-slate-700 text-uppercase mb-1"> Notes / Reference (Optional) </label>
					<input id="paymentNote" type="text" class="form-control form-control-sm text-xs border-slate-200" placeholder="e.g. Monthly quota payout approval" bind:value={paymentNote} />
				</div>

				<!-- Included Contractors -->
				<div class="col-12">
					<div class="d-flex align-items-center justify-content-between mb-1.5">
						<span class="text-xs fw-bold text-slate-700 text-uppercase">
							Included Contractors ({selectedPaymentPassedContractors.length})
						</span>
						<span class="text-2xs text-secondary"> Contractors reaching &ge; 30 worked days </span>
					</div>

					{#if selectedPaymentPassedContractors.length === 0}
						<div class="alert alert-light border border-slate-200 text-secondary text-xs py-2 px-3 mb-0 rounded-3">No passed contractors found for this recruiter in the selected period. Default payout is 0 PLN.</div>
					{:else}
						<div class="table-responsive border border-slate-200 rounded-3 max-h-200">
							<table class="table table-sm align-middle mb-0 text-xs">
								<thead class="table-light text-2xs text-muted text-uppercase">
									<tr>
										<th class="ps-3 py-1.5">ID</th>
										<th class="py-1.5">Contractor Name</th>
										<th class="py-1.5 text-center">Worked Days</th>
										<th class="py-1.5 text-end pe-3">Quota Credit</th>
									</tr>
								</thead>
								<tbody>
									{#each selectedPaymentPassedContractors as contractor (contractor.id)}
										<tr>
											<td class="ps-3 py-1.5 fw-semibold text-primary">#{contractor.id}</td>
											<td class="py-1.5 fw-medium text-slate-800">{contractor.name || 'Unnamed'}</td>
											<td class="py-1.5 text-center">
												<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5 text-2xs fw-bold">
													{contractor.totalWorkedDays} days
												</span>
											</td>
											<td class="py-1.5 text-end pe-3 text-success fw-bold text-2xs"> + 150 PLN </td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>
		{#snippet footer()}
			<button type="button" class="btn btn-success btn-sm px-4 fw-semibold shadow-xs d-inline-flex align-items-center" onclick={submitPayment} disabled={!selectedRecruiterForPayment || submittingPayment}>
				{#if submittingPayment}
					<span class="spinner-border spinner-border-sm me-1.5" role="status"></span>
					<span>Saving...</span>
				{:else}
					<UIcon name="check" size="6" />
					<span class="ms-1.5">Confirm &amp; Save Payout</span>
				{/if}
			</button>
		{/snippet}
	</ClosableModal>

	<div class="container-fluid px-4 py-4 max-w-1600">
		<!-- PAGE TITLE & MAIN ACTIONS -->
		<div class="row align-items-center mb-4 g-3">
			<div class="col-lg-8">
				<div class="d-flex flex-wrap align-items-center gap-2 mb-1">
					<h1 class="h3 fw-bold text-slate-900 mb-0">Recruiter Performance</h1>
					<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 text-xs fw-semibold d-inline-flex align-items-center">
						<UIcon name="clock" size="6" /><span class="ms-2">Min. 30 Days Threshold Rule</span>
					</span>
					<span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 text-xs fw-semibold">
						Active Window: {selectedMonthLabel}
					</span>
				</div>
				<p class="text-secondary small mb-0">Comprehensive compliance tracking, contractor worked days, and provision release eligibility.</p>
			</div>

			<div class="col-lg-4 d-flex justify-content-lg-end align-items-center gap-2">
				<button type="button" class="btn btn-success btn-sm d-flex align-items-center px-3 py-2 rounded-3 shadow-xs" onclick={() => openPaymentModal()}>
					<UIcon name="plus" size="6" /><span class="ms-2 fw-semibold text-xs">Add Payment</span>
				</button>

				{#if !loading && aggregated.length > 0}
					<DownloadRecruiterStats {aggregated} {selectedYear} {selectedMonth} />
				{:else}
					<button class="btn btn-primary btn-sm d-flex align-items-center px-3 py-2 rounded-3 shadow-xs disabled opacity-75" disabled>
						<UIcon name="download" size="6" /><span class="ms-2 fw-semibold text-xs">Download Stats (.xlsx)</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- 4 KPI SUMMARY STATS CARDS -->
		<div class="row g-3 mb-4">
			<!-- Card 1: Tracked Contractors -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Contacts evaluated for recruiter performance whose absolute first deal began in the selected month window. All deals across the 2-month evaluation window are tracked to assess continuity." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Tracked Contractors</span>
								<div class="stat-icon-wrapper bg-blue-subtle text-primary">
									<UIcon name="users-alt" size="5" />
								</div>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{totalContractors}</span>
									<span class="text-secondary small fw-medium">Contractors</span>
								</div>
								<div class="stat-footer mt-1 text-secondary d-flex align-items-center">
									<UIcon name="info" size="6" />
									<span class="ms-2"><strong class="text-slate-800">{unassignedCount}</strong> unassigned contacts ({assignedPercentage}% assigned)</span>
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 2: Benchmark Passed -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Contacts who reached the &ge; 30 worked days threshold. A candidate is counted as successful only if their cumulative worked days across all assignments is at least 30." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Benchmark Passed</span>
								<span class="badge rounded-pill bg-success-subtle text-success fw-bold text-xs px-2.5 py-1">
									{passRate}% Success
								</span>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-1">
									<span class="stat-value text-slate-900">{totalPassed}</span>
									<span class="text-secondary fs-6 fw-medium">/ {totalContractors} Passed</span>
								</div>
								<div class="progress mt-2 rounded-pill stat-progress">
									<div class="progress-bar bg-success rounded-pill" role="progressbar" style="width: {passRate}%" aria-valuenow={parseFloat(passRate)} aria-valuemin={0} aria-valuemax={100}></div>
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 3: Total Worked Days -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Sum of worked days across all deals for tracked contacts. Calculated as (End Date - Start Date) for each deal, with empty end dates counted up to today." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Total Worked Days</span>
								<div class="stat-icon-wrapper bg-rose-subtle text-danger">
									<UIcon name="calendar" size="5" />
								</div>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{totalCumulativeDays}</span>
									<span class="text-secondary small fw-medium">Days Cumulative</span>
								</div>
								<div class="stat-footer mt-1 text-secondary">
									Avg <strong class="text-slate-800">{avgDaysPerResource} days</strong> per assigned resource
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>

			<!-- Card 4: Provision Forecast -->
			<div class="col-sm-6 col-xl-3">
				<TooltipText hoverText="Estimated recruiter quota provision. Contacts passing the &ge; 30-day baseline qualify their assigned recruiter for monthly placement commission." placement="top" class="d-block h-100 cursor-help">
					<div class="card stat-card shadow-xs h-100 border-slate-200">
						<div class="card-body p-3.5 d-flex flex-column justify-content-between">
							<div class="d-flex align-items-start justify-content-between mb-2">
								<span class="stat-label">Provision Forecast</span>
								{#if totalPaidInPeriod > 0}
									<span class="badge rounded-pill bg-success-subtle text-success fw-bold text-xs px-2.5 py-1">
										{totalPaidInPeriod.toLocaleString('de-DE')} PLN Recorded
									</span>
								{:else}
									<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis fw-bold text-xs px-2 py-0.5"> Release Ready </span>
								{/if}
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">{provisionForecast} PLN</span>
								</div>
								<div class="stat-footer mt-1 text-secondary">
									<strong class="text-slate-800">{totalPassed}</strong> Approved accounts ready for payout
									{#if totalPaidInPeriod > 0}
										<div class="text-success fw-semibold mt-1 d-flex align-items-center gap-1">
											<UIcon name="check-circle" size="6" />
											<span>{totalPaidInPeriod.toLocaleString('de-DE')} PLN recorded in system</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</TooltipText>
			</div>
		</div>

		<!-- MAIN DASHBOARD SPLIT VIEW -->
		<div class="row g-4">
			<!-- LEFT COLUMN: BILLING PERIODS SIDEBAR -->
			<div class="col-md-5 col-lg-4 col-xl-3">
				<div class="card period-sidebar-card shadow-xs border-slate-200 mb-3">
					<div class="card-header bg-white py-3 px-3 border-bottom border-slate-200">
						<div class="d-flex align-items-center justify-content-between">
							<div class="d-flex align-items-center">
								<UIcon name="calendar" size="5" class="text-primary" />
								<span class="ms-2 fw-bold text-xs tracking-wider text-slate-800 text-uppercase">Billing Periods</span>
							</div>
							<span class="badge bg-slate-100 text-slate-600 border rounded-pill px-2 py-0.5 text-2xs">
								{allMonths[allMonths.length - 1].monthName.substring(0, 3)} '{allMonths[allMonths.length - 1].label.split(' ')[1].substring(2)} – {allMonths[0].monthName.substring(0, 3)} '{allMonths[0].label.split(' ')[1].substring(2)}
							</span>
						</div>

						<!-- Search input for periods -->
						<div class="period-search-box mt-2.5 position-relative">
							<i class="fi fi-rr-search position-absolute text-muted period-search-icon"></i>
							<input type="text" class="form-control form-control-sm ps-4 rounded-3 text-xs border-slate-200 bg-slate-50" placeholder="Filter months..." bind:value={monthSearch} />
						</div>
					</div>

					<div class="card-body p-2 period-scroll-container">
						<div class="list-group list-group-flush gap-1">
							{#each filteredMonths as m (m.year + '-' + m.month)}
								{@const isActive = !customFrom && selectedYear === m.year && selectedMonth === m.month}
								<button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded-3 px-2.5 py-2 border-0 period-item-btn {isActive ? 'active-period' : ''}" onclick={() => selectMonth(m.year, m.month)}>
									<div class="d-flex align-items-center gap-2 text-truncate">
										<span class="period-dot {isActive ? 'bg-white' : 'bg-slate-300'}"></span>
										<span class="period-name text-xs fw-medium text-truncate {isActive ? 'text-white fw-bold' : 'text-slate-700'}">
											{m.label}
										</span>
									</div>

									<div>
										{#if isActive}
											{#if m.status === 'ready'}
												<span class="badge rounded-pill bg-white text-success text-2xs fw-bold px-2 py-0.5 shadow-xs"> READY </span>
											{:else if m.status === 'in-prep'}
												<span class="badge rounded-pill bg-white text-warning-emphasis text-2xs fw-bold px-2 py-0.5 shadow-xs"> IN PREP </span>
											{:else}
												<span class="badge rounded-pill bg-white text-primary text-2xs fw-bold px-2 py-0.5 shadow-xs"> ACTIVE </span>
											{/if}
										{:else if m.status === 'in-prep'}
											<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis text-2xs px-2 py-0.5 fw-semibold"> In Prep </span>
										{:else if m.status === 'active'}
											<span class="badge rounded-pill bg-primary-subtle text-primary text-2xs px-2 py-0.5 fw-semibold"> Active </span>
										{:else if m.status === 'ready'}
											<span class="badge rounded-pill bg-success-subtle text-success text-2xs px-2 py-0.5 fw-semibold"> Ready </span>
										{:else}
											<span class="text-muted text-2xs fw-medium"> Archived </span>
										{/if}
									</div>
								</button>
							{/each}

							{#if filteredMonths.length === 0}
								<div class="p-3 text-center text-muted text-xs">
									No months match "{monthSearch}"
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- CRITERIA HELPER CARD -->
				<div class="card info-criteria-card border-primary-subtle bg-primary-subtle shadow-xs p-3 rounded-3">
					<div class="d-flex">
						<div class="text-primary mt-0.5">
							<UIcon name="info" size="6" />
						</div>
						<div class="ms-2">
							<div class="fw-bold text-xs text-primary-emphasis mb-1">Evaluation Criteria</div>
							<div class="text-xs text-slate-600 line-height-14">
								Recruiters must register <strong>&ge; 30 worked days</strong> within active project assignments to unlock monthly quota commission.
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- RIGHT COLUMN: RECRUITER PERFORMANCE LIST -->
			<div class="col-md-7 col-lg-8 col-xl-9">
				{#if loading}
					<div class="card border-slate-200 shadow-xs p-5 text-center bg-white rounded-3">
						<div class="spinner-border text-primary mx-auto mb-3" role="status" style="width: 2.5rem; height: 2.5rem;">
							<span class="visually-hidden">Loading data...</span>
						</div>
						<h6 class="fw-bold text-slate-800 mb-1">Evaluating contacts for {selectedMonthLabel}...</h6>
						<p class="text-secondary small mb-0">Cross-checking first start deals and cumulative worked days against 30-day requirement.</p>
					</div>
				{:else if aggregated.length === 0}
					<div class="card border-slate-200 shadow-xs p-5 text-center bg-white rounded-3">
						<div class="empty-icon-box mx-auto mb-3 text-slate-400">
							<UIcon name="users-alt" size="3" />
						</div>
						<h5 class="fw-bold text-slate-800 mb-1">No started contacts found</h5>
						<p class="text-secondary small mb-0">There are no contacts with their absolute first deal starting in {selectedMonthLabel}.</p>
					</div>
				{:else}
					<div in:fly={{ y: -25 }}>
						<!-- RECORDED PAYOUTS SUMMARY FOR ACTIVE PERIOD (IF ANY) -->
						{#if periodPayouts.length > 0}
							<div class="card shadow-xs border-success-subtle bg-white rounded-3 mb-3 overflow-hidden">
								<div class="card-header bg-emerald-50 border-bottom border-emerald-200 py-2.5 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
									<div class="d-flex align-items-center text-emerald-900">
										<UIcon name="credit-card" size="6" class="text-success" />
										<span class="ms-2 fw-bold text-xs tracking-wider text-uppercase">Recorded Payouts for {selectedMonthLabel}</span>
										<span class="badge bg-success text-white rounded-pill ms-2 px-2 py-0.5 text-2xs">
											{periodPayouts.length} Recorded
										</span>
									</div>
									<div class="text-xs fw-bold text-emerald-900">
										Total Period Paid: <span class="text-success fs-6">{totalPaidInPeriod.toLocaleString('de-DE')} PLN</span>
									</div>
								</div>
								<div class="table-responsive">
									<table class="table table-sm align-middle mb-0 text-xs">
										<thead class="table-light text-2xs text-muted text-uppercase">
											<tr>
												<th class="ps-3 py-2">Recruiter</th>
												<th class="py-2 text-center">Amount</th>
												<th class="py-2">Included Contractors</th>
												<th class="py-2 text-center">Date Recorded</th>
												<th class="py-2 pe-3">Notes</th>
											</tr>
										</thead>
										<tbody>
											{#each periodPayouts as p (p.id || p.createdAt)}
												<tr>
													<td class="ps-3 py-2 fw-bold text-slate-800">
														{p.recruiterName || (data.recruiterOptions?.[p.recruiterId] ?? `#${p.recruiterId}`)}
													</td>
													<td class="py-2 text-center">
														<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fw-bold text-xs">
															{Number(p.payoutValue).toLocaleString('de-DE')} PLN
														</span>
													</td>
													<td class="py-2 text-slate-700">
														{#if p.includedContractors && p.includedContractors.length > 0}
															<span class="fw-semibold">{p.includedContractors.length} Contractor(s):</span>
															<span class="text-muted ms-1 text-2xs">
																{p.includedContractors.map((c: any) => `${c.name || '#' + c.id} (${c.days}d)`).join(', ')}
															</span>
														{:else}
															<span class="text-muted italic">None specified</span>
														{/if}
													</td>
													<td class="py-2 text-center text-muted text-2xs">
														{dayjs(p.createdAt).format('DD.MM.YYYY HH:mm')}
													</td>
													<td class="py-2 pe-3 text-secondary text-2xs">
														{p.note || '—'}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}

						<div class="d-flex flex-column gap-3">
							{#each aggregated as group, index (group.recruiterId)}
								{@const isExpanded = isRecruiterExpanded(group.recruiterId, index)}
								{@const filteredContacts = getFilteredContacts(group)}
								{@const activeFilter = recruiterStatusFilter[group.recruiterId] || 'all'}

								<div class="card recruiter-group-card shadow-xs border-slate-200 rounded-3 overflow-hidden">
									<!-- Recruiter Card Header -->
									<div
										class="card-header bg-white p-3 p-md-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom-0 cursor-pointer"
										onclick={() => toggleExpandRecruiter(group.recruiterId, index)}
										role="button"
										tabindex="0"
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleExpandRecruiter(group.recruiterId, index);
											}
										}}
									>
										<div class="d-flex align-items-center gap-3">
											<span class="status-pulse-dot {group.recruiterId === 'Unassigned' ? 'bg-warning' : 'bg-success'} flex-shrink-0"></span>
											<div>
												<div class="d-flex align-items-center gap-2 flex-wrap">
													<h2 class="h5 fw-bold text-slate-900 mb-0">{group.recruiterName}</h2>
													<span class="badge bg-slate-100 text-slate-700 border rounded-pill px-2 py-0.5 text-xs fw-medium">
														{group.recruiterId === 'Unassigned' ? 'Unassigned' : `Recruiter ID: #${group.recruiterId}`}
													</span>
												</div>
											</div>
										</div>

										<div class="d-flex align-items-center gap-2 flex-wrap">
											{#if group.recruiterId !== 'Unassigned'}
												{@const groupPayouts = periodPayouts.filter((p) => p.recruiterId === group.recruiterId)}
												{#if groupPayouts.length > 0}
													{@const groupPaidTotal = groupPayouts.reduce((s, p) => s + (Number(p.payoutValue) || 0), 0)}
													<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-2 text-xs fw-bold d-inline-flex align-items-center">
														<UIcon name="check-circle" size="6" /><span class="ms-1.5">Paid: {groupPaidTotal.toLocaleString('de-DE')} PLN</span>
													</span>
												{/if}
												<button
													type="button"
													class="btn btn-sm btn-outline-success rounded-pill px-3 py-2 text-xs fw-bold d-inline-flex align-items-center gap-1 shadow-xs"
													onclick={(e) => {
														e.stopPropagation();
														openPaymentModal(group.recruiterId);
													}}
												>
													<UIcon name="plus" size="6" />
													<span>Add Payment</span>
												</button>
											{/if}

											<span class="badge rounded-pill bg-success text-white px-3 py-2 text-xs fw-bold shadow-xs d-inline-flex align-items-center">
												<UIcon name="check" size="6" /><span class="ms-2">{group.totalSuccessful} / {group.totalStarted} Passed</span>
											</span>

											<button
												type="button"
												class="ms-2 btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center p-2 text-slate-600 border hover-bg-slate-100"
												style="width: 34px; height: 34px;"
												onclick={(e) => {
													e.stopPropagation();
													toggleExpandRecruiter(group.recruiterId, index);
												}}
												aria-label={isExpanded ? 'Collapse recruiter' : 'Expand recruiter'}
											>
												<UIcon name={isExpanded ? 'angle-up' : 'angle-down'} size="6" class="m-0" />
											</button>
										</div>
									</div>

									<!-- Collapsible Body -->
									{#if isExpanded}
										<div class="card-body p-0 border-top border-slate-200 bg-white" transition:slide>
											<!-- Table Filter & Search Controls Toolbar -->
											<div class="px-3 py-2.5 bg-slate-50 border-bottom border-slate-200 d-flex flex-wrap align-items-center justify-content-between gap-2">
												<div class="position-relative recruiter-table-search">
													<i class="fi fi-rr-search position-absolute text-muted table-search-icon"></i>
													<input type="text" class="form-control form-control-sm ps-4 rounded-3 text-xs bg-white border-slate-200" placeholder="Search contact or name or ID..." value={recruiterSearch[group.recruiterId] || ''} oninput={(e) => (recruiterSearch[group.recruiterId] = (e.target as HTMLInputElement).value)} />
												</div>

												<div class="d-flex align-items-center gap-2">
													<span class="text-xs text-secondary fw-semibold me-1">Filter:</span>
													<div class="btn-group btn-group-sm shadow-xs rounded-pill p-0.5 bg-white border gap-2" role="group">
														<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'all' ? 'btn-primary' : 'btn-light text-secondary'}" onclick={() => (recruiterStatusFilter[group.recruiterId] = 'all')}>
															All ({group.contacts.length})
														</button>
														<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'passed' ? 'btn-success text-white' : 'btn-light text-secondary'}" onclick={() => (recruiterStatusFilter[group.recruiterId] = 'passed')}>
															Passed ({group.totalSuccessful})
														</button>
														<button type="button" class="btn btn-sm rounded-pill px-2.5 py-0.5 text-xs fw-semibold {activeFilter === 'failed' ? 'btn-danger text-white' : 'btn-light text-secondary'}" onclick={() => (recruiterStatusFilter[group.recruiterId] = 'failed')}>
															Failed ({group.totalStarted - group.totalSuccessful})
														</button>
													</div>
												</div>
											</div>

											<!-- Contacts Data Table -->
											<div class="table-responsive">
												<table class="table align-middle mb-0 custom-contacts-table">
													<thead>
														<tr>
															<th class="ps-3 cursor-pointer user-select-none hover-dark" style="width: 80px;" onclick={() => toggleSort('id')}>
																<div class="d-flex align-items-center gap-1">
																	ID
																	{#if sortColumn === 'id'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('name')}>
																<div class="d-flex align-items-center gap-1">
																	CONTRACTOR NAME
																	{#if sortColumn === 'name'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('placement')}>
																<div class="d-flex align-items-center gap-1">
																	PROJECT
																	{#if sortColumn === 'placement'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 160px;" onclick={() => toggleSort('totalWorkedDays')}>
																<div class="d-flex align-items-center justify-content-center gap-1">
																	<TooltipText text="TOTAL WORKED DAYS" hoverText="Sum of worked days across all deals. Target &ge; 30 days to qualify for commission." placement="top" />
																	{#if sortColumn === 'totalWorkedDays'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 140px;" onclick={() => toggleSort('evalPeriodDays')}>
																<div class="d-flex align-items-center justify-content-center gap-1">
																	<TooltipText text="EVAL PERIOD DAYS" hoverText="Worked days evaluated strictly in the 2-month qualifying window." placement="top" />
																	{#if sortColumn === 'evalPeriodDays'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 120px;" onclick={() => toggleSort('status')}>
																<div class="d-flex align-items-center justify-content-center gap-1">
																	STATUS
																	{#if sortColumn === 'status'}
																		<UIcon name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} size="7" />
																	{/if}
																</div>
															</th>
															<th class="text-end pe-3" style="width: 140px;">DEALS</th>
														</tr>
													</thead>
													<tbody>
														{#each filteredContacts as contact (contact.id)}
															{@const isContactExpanded = !!expandedContacts[contact.id]}
															{@const deficitDays = 30 - (contact.totalWorkedDays || 0)}
															<tr class={!contact.isSuccessful ? 'row-warning-light' : 'row-normal'}>
																<!-- ID -->
																<td class="ps-3 fw-bold text-primary text-xs">
																	<a href="{CONTACT_BASE_URL}{contact.id}/" target="_blank" class="text-decoration-none fw-semibold">
																		#{contact.id}
																	</a>
																</td>

																<!-- Contact Name & Avatar -->
																<td>
																	<div class="d-flex align-items-center gap-2.5 py-1">
																		<ContactAvatar name={contact.name || ''} />
																		<div>
																			<a href="{CONTACT_BASE_URL}{contact.id}/" target="_blank" class="fw-bold text-slate-900 text-decoration-none hover-primary text-sm">
																				{contact.name || 'Unnamed Candidate'}
																			</a>
																		</div>
																	</div>
																</td>

																<!-- Placement Firm / Project -->
																<td>
																	<span class="badge bg-slate-100 text-slate-700 border rounded-pill px-2.5 py-1 text-2xs fw-medium">
																		{getPlacementName(contact)}
																	</span>
																</td>

																<!-- Total Worked Days -->
																<td class="text-center">
																	{#if contact.isSuccessful}
																		<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1 text-xs fw-bold">
																			• {contact.totalWorkedDays} days
																		</span>
																	{:else}
																		<span class="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 text-xs fw-bold">
																			• {contact.totalWorkedDays} days
																		</span>
																	{/if}
																</td>

																<!-- Eval Period Days -->
																<td class="text-center text-secondary text-xs fw-medium small">
																	{contact.totalWorkedDaysEval} days
																</td>

																<!-- Status Badge -->
																<td class="text-center">
																	{#if contact.isSuccessful}
																		<span class="badge rounded-pill bg-success text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																			<UIcon name="check" size="7" /><span class="ms-2">Passed</span>
																		</span>
																	{:else}
																		<span class="badge rounded-pill bg-danger text-white px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center shadow-xs">
																			<UIcon name="cross" size="7" /><span class="ms-2">Failed</span>
																		</span>
																	{/if}
																</td>

																<!-- Deals Toggle Button -->
																<td class="text-end pe-3">
																	<button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1 text-xs fw-semibold hover-shadow d-inline-flex align-items-center gap-1.5 {isContactExpanded ? 'active-deal-btn' : ''}" onclick={() => toggleExpandContact(contact.id)}>
																		<span class="me-2">{isContactExpanded ? 'Hide' : 'Show'} ({contact.deals?.length || 0})</span>
																		<UIcon name={isContactExpanded ? 'angle-up' : 'angle-down'} size="7" />
																	</button>
																</td>
															</tr>

															<!-- Nested Deals Details Panel -->
															{#if isContactExpanded}
																<tr class="deals-expanded-row">
																	<td colspan="7" class="p-3 bg-slate-50">
																		<div class="card deals-detail-panel shadow-xs border-indigo-subtle rounded-3 overflow-hidden">
																			<!-- Header -->
																			<div class="card-header bg-white py-2.5 px-3 border-bottom border-indigo-subtle d-flex flex-wrap align-items-center justify-content-between gap-2">
																				<div class="d-flex align-items-center">
																					<UIcon name="briefcase" size="6" class="text-primary" />
																					<span class="ms-2 fw-bold text-xs tracking-wider text-slate-800 text-uppercase">
																						DEALS &amp; ENGAGEMENT HISTORY FOR <span class="text-primary">{contact.name || 'CANDIDATE'}</span>
																					</span>
																				</div>
																				<div class="text-xs text-secondary">
																					Active Projects: <strong class="text-slate-800">{contact.deals?.length || 0} Accounts</strong> | Total Window Days:
																					<strong class={contact.isSuccessful ? 'text-success' : 'text-danger'}>
																						{contact.totalWorkedDays} / 30 Days
																					</strong>
																				</div>
																			</div>

																			<!-- Table -->
																			<div class="table-responsive bg-white">
																				<table class="table table-sm align-middle mb-0 nested-deals-table">
																					<thead class="table-light text-2xs text-muted text-uppercase">
																						<tr>
																							<th class="ps-3 py-2" style="width: 100px;">Deal ID</th>
																							<th class="py-2">Client Project</th>
																							<th class="py-2 text-center" style="width: 120px;">Work Start</th>
																							<th class="py-2 text-center" style="width: 120px;">Work End</th>
																							<th class="py-2 text-center" style="width: 100px;">Days Total</th>
																							<th class="py-2 text-center" style="width: 100px;">Days Eval</th>
																							<th class="py-2 text-center pe-3" style="width: 130px;">Approval Status</th>
																						</tr>
																					</thead>
																					<tbody>
																						{#each contact.deals as deal (deal.id)}
																							{@const pName = deal.projectId && projectOptions[deal.projectId] ? projectOptions[deal.projectId] : deal.title}
																							<tr>
																								<td class="ps-3 py-2 fw-bold text-xs">
																									<a href="{DEAL_BASE_URL}{deal.id}/" target="_blank" class="text-decoration-none">
																										#{deal.id}
																									</a>
																								</td>
																								<td class="py-2">
																									<div class="fw-semibold text-slate-800 text-xs">{pName}</div>
																									{#if deal.title && deal.title !== pName}
																										<div class="text-muted text-2xs">{deal.title}</div>
																									{/if}
																								</td>
																								<td class="py-2 text-center text-xs text-secondary">
																									{dayjs(deal.workStart).format('DD.MM.YYYY')}
																								</td>
																								<td class="py-2 text-center text-xs">
																									{#if deal.workEnd}
																										<span class="text-secondary">{dayjs(deal.workEnd).format('DD.MM.YYYY')}</span>
																									{:else}
																										<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis fw-bold text-2xs px-2 py-0.5"> Present </span>
																									{/if}
																								</td>
																								<td class="py-2 text-center fw-bold text-xs text-slate-800">
																									{deal.days}
																								</td>
																								<td class="py-2 text-center text-xs text-secondary small">
																									{deal.evalDays}
																								</td>
																								<td class="py-2 text-center pe-3">
																									{#if contact.isSuccessful || deal.days >= 30}
																										<span class="text-success text-2xs fw-bold d-inline-flex align-items-center">
																											<UIcon name="check" size="6" /><span class="ms-2">Signed Off</span>
																										</span>
																									{:else}
																										<span class="text-warning-emphasis text-2xs fw-bold d-inline-flex align-items-center">
																											<span class="status-dot-sm bg-warning"></span><span class="ms-2">In Progress</span>
																										</span>
																									{/if}
																								</td>
																							</tr>
																						{/each}
																					</tbody>
																				</table>
																			</div>

																			<!-- Warning Box if not successful -->
																			{#if !contact.isSuccessful}
																				<div class="p-2.5 bg-warning-subtle border-top border-warning-subtle d-flex flex-wrap align-items-center justify-content-between gap-2">
																					<div class="d-flex align-items-center text-warning-emphasis text-xs">
																						<UIcon name="exclamation" size="6" />
																						<span class="ms-2">
																							Short by <strong>{deficitDays} day(s)</strong> ({contact.totalWorkedDays}/30). Needs manual supervisor sign-off or overtime adjustment to qualify for {selectedMonthLabel} bonus.
																						</span>
																					</div>
																					<a href="{CONTACT_BASE_URL}{contact.id}/" target="_blank" class="btn btn-sm btn-link text-warning-emphasis text-decoration-none fw-bold p-0 text-xs hover-underline"> Request Audit Override &rarr; </a>
																				</div>
																			{/if}
																		</div>
																	</td>
																</tr>
															{/if}
														{:else}
															<tr>
																<td colspan="7" class="text-center py-4 text-muted small"> No contacts match the filter criteria. </td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<!-- FOOTER PAGINATION & AUDIT STATUS -->
						<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4 pt-3 border-top border-slate-200">
							<div class="text-secondary text-xs">
								Showing <strong class="text-slate-800">{aggregated.length}</strong> recruiter unit(s) evaluated
							</div>

							<div class="d-flex align-items-center gap-1">
								<button type="button" class="btn btn-sm btn-light border text-slate-500 rounded-3 text-xs px-2.5 py-1" disabled> Previous </button>
								<button type="button" class="btn btn-sm btn-primary rounded-3 text-xs px-2.5 py-1 fw-bold"> 1 </button>
								<button type="button" class="btn btn-sm btn-light border text-slate-500 rounded-3 text-xs px-2.5 py-1" disabled> Next </button>
							</div>
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
					<span class="status-dot-sm bg-success"></span><span class="ms-2">All Quota Engines Operational</span>
				</span>
			</div>
			<div>
				Evaluation Period: <strong class="text-slate-700">{evalPeriodStartLabel} – {evalPeriodEndLabel}</strong> (Audit Time: 23:59 CET)
			</div>
		</div>
	</footer>
</div>
