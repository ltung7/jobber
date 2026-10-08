<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { internal } from '$lib/nav/internal';
	import dayjs from 'dayjs';
	import DownloadRecruiterStats from './DownloadRecruiterStats.svelte';
	import TooltipText from '$lib/misc/TooltipText.svelte';
	import UIcon from '$lib/misc/UIcon.svelte';
	import ClosableModal from '$lib/misc/ClosableModal.svelte';
	import Flatpickr from 'svelte-flatpickr';
	import 'flatpickr/dist/flatpickr.css';

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
	let loading = $state(true);
	let expandedRecruiters = $state<Record<string, boolean>>({});
	let expandedContacts = $state<Record<string, boolean>>({});
	let projectOptions = $state<Record<string, string>>(untrack(() => data.projectOptions || {}));

	// Search and filter states
	let monthSearch = $state('');
	let recruiterSearch = $state<Record<string, string>>({});
	let recruiterStatusFilter = $state<Record<string, 'all' | 'passed' | 'failed'>>({});

	// Generate last 18 months array for the left sidebar navigation
	const allMonths = Array.from({ length: 18 }).map((_, i) => {
		const d = dayjs().subtract(i, 'month');
		let status: 'in-prep' | 'active' | 'ready' | 'archived' = 'archived';
		if (i === 0) status = 'in-prep';
		else if (i === 1) status = 'active';
		else if (i === 2) status = 'ready';

		return {
			label: d.format('MMMM YYYY'),
			month: d.format('MM'),
			year: d.format('YYYY'),
			monthName: d.format('MMMM'),
			status
		};
	});

	let filteredMonths = $derived(allMonths.filter((m) => m.label.toLowerCase().includes(monthSearch.trim().toLowerCase())));

	const selectedMonthObj = $derived(dayjs(`${selectedYear}-${selectedMonth}-01`));
	const selectedMonthLabel = $derived(customFrom ? `${dayjs(`${customFrom}-01`).format('MMM YYYY')} - ${dayjs(`${customTo}-01`).format('MMM YYYY')}` : selectedMonthObj.format('MMMM YYYY'));
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
	const totalContractors = $derived(contacts.length);
	const totalPassed = $derived(contacts.filter((c) => c.isSuccessful).length);
	const passRate = $derived(totalContractors > 0 ? ((totalPassed / totalContractors) * 100).toFixed(1) : '0.0');
	const totalCumulativeDays = $derived(contacts.reduce((sum, c) => sum + (c.totalWorkedDays || 0), 0));
	const avgDaysPerResource = $derived(totalContractors > 0 ? (totalCumulativeDays / totalContractors).toFixed(1) : '0.0');
	const provisionForecast = $derived((totalPassed * 150).toLocaleString('de-DE'));

	// Avatar styling helper
	const AVATAR_PALETTES = [
		{ bg: '#dbeafe', text: '#1d4ed8' }, // Blue
		{ bg: '#f3e8ff', text: '#7e22ce' }, // Purple
		{ bg: '#d1fae5', text: '#047857' }, // Emerald
		{ bg: '#fef3c7', text: '#b45309' }, // Amber
		{ bg: '#fee2e2', text: '#b91c1c' }, // Rose
		{ bg: '#e0e7ff', text: '#4338ca' }, // Indigo
		{ bg: '#ccfbf1', text: '#0f766e' } // Teal
	];

	function getInitials(name: string): string {
		if (!name) return '??';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	function getAvatarPalette(name: string) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % AVATAR_PALETTES.length;
		return AVATAR_PALETTES[index];
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
	<header class="app-topbar px-4 py-2 bg-white border-bottom shadow-xs">
		<div class="container-fluid px-0 d-flex flex-wrap align-items-center justify-content-between gap-3">
			<!-- Brand -->
			<div class="d-flex align-items-center gap-3">
				<div class="brand-icon-box shadow-xs">
					<UIcon name="bolt" size="5" class="text-white" />
				</div>
				<div>
					<div class="d-flex align-items-center gap-2">
						<span class="fw-bolder fs-5 tracking-tight text-slate-900">EISG</span>
						<span class="badge rounded-pill bg-purple-subtle text-purple fw-semibold px-2 py-0.5 text-xs">BITRIX</span>
					</div>
					<div class="text-secondary small line-height-1">Provision & Recruiter Quota Analytics Engine</div>
				</div>
			</div>

			<!-- Header Quick Controls & Status -->
			<div class="d-flex align-items-center flex-wrap gap-3">
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
			</div>
		</div>
	</header>

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
								<div class="stat-footer mt-1 text-success d-flex align-items-center">
									<UIcon name="check-circle" size="6" />
									<span class="ms-2">100% evaluated against 30d baseline</span>
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
								<span class="badge rounded-pill bg-warning-subtle text-warning-emphasis fw-bold text-xs px-2 py-0.5"> Release Ready </span>
							</div>
							<div>
								<div class="d-flex align-items-baseline gap-2">
									<span class="stat-value">€{provisionForecast}</span>
									<span class="text-success small fw-semibold">+12.4% MoM</span>
								</div>
								<div class="stat-footer mt-1 text-secondary">
									<strong class="text-slate-800">{totalPassed}</strong> Approved accounts ready for payout
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
								{allMonths[allMonths.length - 1].year}–{allMonths[0].year}
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

									<div class="d-flex align-items-center gap-2.5">
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
									<div class="card-body p-0 border-top border-slate-200 bg-white">
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
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('name')}>
															<div class="d-flex align-items-center gap-1">
																CONTRACTOR NAME
																{#if sortColumn === 'name'}
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="cursor-pointer user-select-none hover-dark" onclick={() => toggleSort('placement')}>
															<div class="d-flex align-items-center gap-1">
																PROJECT
																{#if sortColumn === 'placement'}
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 160px;" onclick={() => toggleSort('totalWorkedDays')}>
															<div class="d-flex align-items-center justify-content-center gap-1">
																<TooltipText text="TOTAL WORKED DAYS" hoverText="Sum of worked days across all deals. Target &ge; 30 days to qualify for commission." placement="top" />
																{#if sortColumn === 'totalWorkedDays'}
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 140px;" onclick={() => toggleSort('evalPeriodDays')}>
															<div class="d-flex align-items-center justify-content-center gap-1">
																<TooltipText text="EVAL PERIOD DAYS" hoverText="Worked days evaluated strictly in the 2-month qualifying window." placement="top" />
																{#if sortColumn === 'evalPeriodDays'}
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="text-center cursor-pointer user-select-none hover-dark" style="width: 120px;" onclick={() => toggleSort('status')}>
															<div class="d-flex align-items-center justify-content-center gap-1">
																STATUS
																{#if sortColumn === 'status'}
																	<UIcon name={sortDirection === 'asc' ? 'angle-up' : 'angle-down'} size="6" />
																{/if}
															</div>
														</th>
														<th class="text-end pe-3" style="width: 140px;">DEALS</th>
													</tr>
												</thead>
												<tbody>
													{#each filteredContacts as contact (contact.id)}
														{@const palette = getAvatarPalette(contact.name || '')}
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
																	<div class="contact-avatar-circle shadow-xs me-2" style="background-color: {palette.bg}; color: {palette.text};">
																		{getInitials(contact.name || '')}
																	</div>
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

<style>
	/* Design tokens & slate palette */
	:global(:root) {
		--tp-slate-50: #f8fafc;
		--tp-slate-100: #f1f5f9;
		--tp-slate-200: #e2e8f0;
		--tp-slate-300: #cbd5e1;
		--tp-slate-600: #475569;
		--tp-slate-700: #334155;
		--tp-slate-800: #1e293b;
		--tp-slate-900: #0f172a;
	}

	.dashboard-wrapper {
		background-color: #f6f8fc;
		min-height: 100vh;
		padding-bottom: 60px;
		font-family:
			'Montserrat',
			system-ui,
			-apple-system,
			sans-serif;
	}

	.max-w-1600 {
		max-width: 1600px;
		margin-left: auto;
		margin-right: auto;
	}

	/* Top branding */
	.app-topbar {
		position: sticky;
		top: 0;
		z-index: 1020;
	}

	.brand-icon-box {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Stat Cards */
	.stat-card {
		background: #ffffff;
		border-radius: 14px;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.stat-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--tp-slate-600);
	}

	.stat-value {
		font-size: 1.85rem;
		font-weight: 800;
		color: var(--tp-slate-900);
		line-height: 1.1;
	}

	.stat-icon-wrapper {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-footer {
		font-size: 0.75rem;
	}

	.stat-progress {
		height: 6px;
		background-color: #e2e8f0;
	}

	/* Periods Sidebar */
	.period-sidebar-card {
		border-radius: 14px;
		background: #ffffff;
	}

	.period-search-icon {
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.7rem;
	}

	.period-scroll-container {
		max-height: calc(100vh - 280px);
		overflow-y: auto;
	}

	.period-item-btn {
		transition: all 0.15s ease;
	}

	.period-item-btn:hover:not(.active-period) {
		background-color: var(--tp-slate-100);
	}

	.active-period {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
		box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
	}

	.period-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		display: inline-block;
	}

	/* Recruiter Group Cards */
	.recruiter-group-card {
		background: #ffffff;
		border-radius: 14px;
		transition: box-shadow 0.15s ease;
	}

	.recruiter-group-card:hover {
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
	}

	.recruiter-table-search {
		width: 260px;
	}

	.table-search-icon {
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.75rem;
	}

	/* Contacts Table */
	.custom-contacts-table thead th {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--tp-slate-600);
		background-color: #f8fafc;
		border-bottom: 1px solid var(--tp-slate-200);
		padding-top: 12px;
		padding-bottom: 12px;
	}

	.custom-contacts-table tbody tr {
		transition: background-color 0.12s ease;
	}

	.custom-contacts-table tbody tr.row-normal:hover {
		background-color: #f8fafc;
	}

	.custom-contacts-table tbody tr.row-warning-light {
		background-color: #fffdf5;
	}

	.custom-contacts-table tbody tr.row-warning-light:hover {
		background-color: #fffbeb;
	}

	.contact-avatar-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.78rem;
		flex-shrink: 0;
	}

	.active-deal-btn {
		background-color: var(--tp-slate-800) !important;
		color: #ffffff !important;
		border-color: var(--tp-slate-800) !important;
	}

	/* Nested Deals Panel */
	.deals-detail-panel {
		border-radius: 10px;
		border: 1px solid #c7d2fe;
	}

	.nested-deals-table thead th {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		background-color: #f1f5f9;
	}

	/* Pulse dot */
	.status-pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.status-dot-sm {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		display: inline-block;
	}

	/* Utility typography and colors */
	.text-2xs {
		font-size: 0.68rem;
	}

	.line-height-1 {
		line-height: 1.1;
	}

	.line-height-14 {
		line-height: 1.4;
	}

	.tracking-tight {
		letter-spacing: -0.02em;
	}

	.tracking-wider {
		letter-spacing: 0.05em;
	}

	.bg-purple-subtle {
		background-color: #f3e8ff;
	}

	.text-purple {
		color: #7e22ce;
	}

	.bg-blue-subtle {
		background-color: #eff6ff;
	}

	.bg-rose-subtle {
		background-color: #fff1f2;
	}

	.bg-slate-50 {
		background-color: #f8fafc;
	}

	.bg-slate-100 {
		background-color: #f1f5f9;
	}

	.text-slate-600 {
		color: #475569;
	}

	.text-slate-700 {
		color: #334155;
	}

	.text-slate-800 {
		color: #1e293b;
	}

	.text-slate-900 {
		color: #0f172a;
	}

	.border-slate-200 {
		border-color: #e2e8f0 !important;
	}

	.border-indigo-subtle {
		border-color: #e0e7ff !important;
	}

	.shadow-xs {
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
	}

	.hover-primary:hover {
		color: #2563eb !important;
	}

	.hover-dark:hover {
		color: #0f172a !important;
	}

	.user-select-none {
		user-select: none;
	}

	.hover-shadow:hover {
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}

	.hover-underline:hover {
		text-decoration: underline !important;
	}

	.cursor-pointer {
		cursor: pointer;
	}
</style>
