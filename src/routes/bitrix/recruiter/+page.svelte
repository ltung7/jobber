<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { internal } from '$lib/nav/internal';
    import dayjs from 'dayjs';

    const CONTACT_BASE_URL = 'https://eisg.bitrix24.pl/crm/contact/details/';
    const DEAL_BASE_URL = 'https://eisg.bitrix24.pl/crm/deal/details/';

    let { data } = $props();
    
    // Internal state for selected period and fetching
    let selectedYear = $state(untrack(() => data.selectedYear));
    let selectedMonth = $state(untrack(() => data.selectedMonth));
    let contacts = $state<any[]>([]);
    let loading = $state(true);
    let expandedRecruiters = $state<Record<string, boolean>>({});
    let expandedContacts = $state<Record<string, boolean>>({});

    // Generate last 12 months array for the left sidebar navigation
    const last12Months = Array.from({ length: 12 }).map((_, i) => {
        const d = dayjs().subtract(i, 'month');
        return {
            label: d.format('MMMM YYYY'),
            month: d.format('MM'),
            year: d.format('YYYY')
        };
    });

    async function fetchAnalytics(year: string, month: string) {
        loading = true;
        try {
            const response: any = await internal.getApi({ year, month });
            if (response && response.contacts) {
                contacts = response.contacts;
            } else {
                contacts = [];
            }
        } catch (err) {
            console.error("Failed to fetch recruiter analytics", err);
            contacts = [];
        } finally {
            loading = false;
        }
    }

    function selectMonth(year: string, month: string) {
        selectedYear = year;
        selectedMonth = month;
        fetchAnalytics(year, month);
    }

    function toggleExpandRecruiter(recruiterId: string) {
        expandedRecruiters[recruiterId] = !expandedRecruiters[recruiterId];
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
            let rName = data.recruiterOptions[rId];
            
            // Join "N/A" (or specific ID 1186) with "Unassigned"
            if (!rId || rId === 'Unassigned' || rId === '1186' || rName === 'N/A') {
                rId = 'Unassigned';
                rName = 'Unassigned';
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
        
        // Return sorted array (most successful first)
        return Object.values(grouped).sort((a: any, b: any) => b.totalSuccessful - a.totalSuccessful || b.totalStarted - a.totalStarted);
    });
</script>

<style>
    .hover-bg-light:hover {
        background-color: #f8f9fa;
    }
    .warning-row {
        background-color: #fff3cd !important;
    }
</style>

<div class="container-fluid py-4">
    <div class="row g-4">
        <!-- LEFT COLUMN: Period Selector -->
        <div class="col-md-3 col-lg-2">
            <h4 class="mb-3 fw-bold">Period</h4>
            <div class="list-group shadow-sm">
                {#each last12Months as m}
                    <button 
                        type="button"
                        class="list-group-item list-group-item-action {selectedYear === m.year && selectedMonth === m.month ? 'active fw-bold' : ''}"
                        onclick={() => selectMonth(m.year, m.month)}>
                        {m.label}
                    </button>
                {/each}
            </div>
        </div>

        <!-- RIGHT COLUMN: Recruiter Analytics -->
        <div class="col-md-9 col-lg-10">
            <h4 class="fw-bold mb-3">Recruiter Performance (Min. 30 days)</h4>
            
            {#if loading}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>Evaluating contacts for selected period...</div>
                </div>
            {:else if aggregated.length === 0}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    No started contacts found for this period.
                </div>
            {:else}
                <ul class="list-group shadow-sm">
                    {#each aggregated as group}
                        <li class="list-group-item p-0 overflow-hidden">
                            <!-- Recruiter Header -->
                            <button 
                                type="button" 
                                class="w-100 btn btn-link text-decoration-none text-dark d-flex justify-content-between align-items-center p-3 text-start hover-bg-light" 
                                onclick={() => toggleExpandRecruiter(group.recruiterId)}
                                style="border-radius: 0; box-shadow: none;"
                            >
                                <div class="fw-bold fs-5">{group.recruiterName}</div>
                                
                                <div class="d-flex gap-3 align-items-center">
                                    <span class="badge bg-success text-white rounded-pill px-3 py-2 fs-6">
                                        {group.totalSuccessful} / {group.totalStarted} Passed
                                    </span>
                                    <span class="text-secondary text-center" style="width: 24px;">
                                        {#if expandedRecruiters[group.recruiterId]} 
                                            <i class="fi fi-rr-angle-up"></i>
                                        {:else} 
                                            <i class="fi fi-rr-angle-down"></i>
                                        {/if}
                                    </span>
                                </div>
                            </button>

                            <!-- Recruiter Contacts List -->
                            {#if expandedRecruiters[group.recruiterId]}
                                <div class="p-3 bg-light border-top">
                                    <div class="table-responsive bg-white rounded border">
                                        <table class="table table-hover mb-0 text-sm">
                                            <thead class="table-light">
                                                <tr>
                                                    <th class="px-3 py-2" style="width: 75px;">ID</th>
                                                    <th class="px-3 py-2">Contact Name</th>
                                                    <th class="px-3 py-2 text-center" style="width: 150px;">Total Worked Days</th>
                                                    <th class="px-3 py-2 text-center" style="width: 100px;">Status</th>
                                                    <th class="px-3 py-2 text-center" style="width: 50px;">Deals</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each group.contacts as contact}
                                                    <tr class={!contact.isSuccessful ? 'warning-row' : ''}>
                                                        <td class="px-3 py-2 fw-medium align-middle">
                                                            <a href="{CONTACT_BASE_URL}{contact.id}/" target="_blank" class="text-decoration-none">#{contact.id}</a>
                                                        </td>
                                                        <td class="px-3 py-2 align-middle">
                                                            <a href="{CONTACT_BASE_URL}{contact.id}/" target="_blank" class="text-decoration-none text-dark fw-bold">{contact.name || 'Unnamed'}</a>
                                                        </td>
                                                        <td class="px-3 py-2 text-center align-middle fw-bold {contact.isSuccessful ? 'text-success' : 'text-danger'}">
                                                            {contact.totalWorkedDays} days
                                                        </td>
                                                        <td class="px-3 py-2 text-center align-middle">
                                                            {#if contact.isSuccessful}
                                                                <span class="badge bg-success">Passed</span>
                                                            {:else}
                                                                <span class="badge bg-danger">Failed</span>
                                                            {/if}
                                                        </td>
                                                        <td class="px-3 py-2 text-center align-middle">
                                                            <button 
                                                                class="btn btn-sm btn-outline-secondary" 
                                                                onclick={() => toggleExpandContact(contact.id)}
                                                            >
                                                                {expandedContacts[contact.id] ? 'Hide' : 'Show'} ({contact.deals.length})
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    <!-- Nested Deals Row -->
                                                    {#if expandedContacts[contact.id]}
                                                        <tr class="table-secondary">
                                                            <td colspan="5" class="p-3">
                                                                <div class="bg-white rounded border p-2">
                                                                    <strong class="d-block mb-2 text-muted">Deals history for {contact.name}:</strong>
                                                                    <table class="table table-sm table-striped mb-0">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>Deal ID</th>
                                                                                <th>Title</th>
                                                                                <th>Work Start</th>
                                                                                <th>Work End</th>
                                                                                <th>Days</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {#each contact.deals as deal}
                                                                                <tr>
                                                                                    <td><a href="{DEAL_BASE_URL}{deal.id}/" target="_blank">#{deal.id}</a></td>
                                                                                    <td>{deal.title}</td>
                                                                                    <td>{dayjs(deal.workStart).format('DD.MM.YYYY')}</td>
                                                                                    <td>{deal.workEnd ? dayjs(deal.workEnd).format('DD.MM.YYYY') : 'Present'}</td>
                                                                                    <td>{deal.days}</td>
                                                                                </tr>
                                                                            {/each}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    {/if}
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>
