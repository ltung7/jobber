<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { internal } from '$lib/nav/internal';
    import dayjs from 'dayjs';
    import type { BitrixLead } from '$lib/bitrix/bitrix.d';

    const BASE_URL = 'https://eisg.bitrix24.pl/crm/lead/details/';

    let { data } = $props();
    
    // Internal state for selected period and fetching
    let selectedYear = $state(untrack(() => data.selectedYear));
    let selectedMonth = $state(untrack(() => data.selectedMonth));
    let leads = $state<BitrixLead[]>([]);
    let loading = $state(true);
    let expandedUsers = $state<Record<string, boolean>>({});

    // Generate last 12 months array for the left sidebar navigation
    const last12Months = Array.from({ length: 12 }).map((_, i) => {
        // Using dayjs on current date and walking backwards
        const d = dayjs().subtract(i, 'month');
        return {
            label: d.format('MMMM YYYY'),
            month: d.format('MM'),
            year: d.format('YYYY')
        };
    });

    // Fetch leads through our client-side internal.getApi wrapper
    async function fetchLeads(year: string, month: string) {
        loading = true;
        try {
            // internal.getApi appends '/api' to current pathname, routing to our new +server.ts
            const response: any = await internal.getApi({ year, month });
            if (response && response.leads) {
                leads = response.leads;
            } else {
                leads = [];
            }
        } catch (err) {
            console.error("Failed to fetch leads", err);
            leads = [];
        } finally {
            loading = false;
        }
    }

    function selectMonth(year: string, month: string) {
        selectedYear = year;
        selectedMonth = month;
        fetchLeads(year, month);
    }

    function toggleExpand(userId: string) {
        expandedUsers[userId] = !expandedUsers[userId];
    }

    // Trigger initial fetch when page mounts
    onMount(() => {
        fetchLeads(selectedYear, selectedMonth);
    });

    // Aggregate data grouped by user using Svelte 5 $derived.by rune
    let aggregated = $derived.by(() => {
        const grouped: Record<string, any> = {};
        
        for (const lead of leads) {
            const uId = lead.ASSIGNED_BY_ID;
            
            if (!grouped[uId]) {
                grouped[uId] = {
                    userId: uId,
                    userName: data.userMap.get(uId) || 'Unknown User',
                    leads: [],
                    totalClosed: 0,
                    totalValue: 0
                };
            }
            
            grouped[uId].leads.push(lead);
            grouped[uId].totalClosed++;
            grouped[uId].totalValue += Number(lead.OPPORTUNITY || 0);
        }
        
        // Return sorted array (most leads first)
        return Object.values(grouped).sort((a: any, b: any) => b.totalClosed - a.totalClosed);
    });
</script>

<style>
    .hover-bg-light:hover {
        background-color: #f8f9fa;
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

        <!-- RIGHT COLUMN: Leads List Group -->
        <div class="col-md-9 col-lg-10">
            <h4 class="mb-3 fw-bold">Leads Performance</h4>
            
            {#if loading}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>Loading leads data for selected period...</div>
                </div>
            {:else if aggregated.length === 0}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    No successfully closed leads found for this period.
                </div>
            {:else}
                <!-- ul.list-group structure -->
                <ul class="list-group shadow-sm">
                    {#each aggregated as userGroup}
                        <li class="list-group-item p-0 overflow-hidden">
                            
                            <!-- Header (Clickable for toggle) -->
                            <button 
                                type="button" 
                                class="w-100 btn btn-link text-decoration-none text-dark d-flex justify-content-between align-items-center p-3 text-start hover-bg-light" 
                                onclick={() => toggleExpand(userGroup.userId)}
                                style="border-radius: 0; box-shadow: none;"
                            >
                                <div class="fw-bold fs-5">{userGroup.userName}</div>
                                
                                <div class="d-flex gap-3 align-items-center">
                                    <span class="badge bg-primary text-white rounded-pill px-3 py-2 fs-6">
                                        {userGroup.totalClosed} Leads
                                    </span>
                                    <span class="text-secondary text-center" style="width: 24px;">
                                        {#if expandedUsers[userGroup.userId]} 
                                            <i class="fi fi-rr-angle-up"></i>
                                        {:else} 
                                            <i class="fi fi-rr-angle-down"></i>
                                        {/if}
                                    </span>
                                </div>
                            </button>

                            <!-- Expandable Table of User's Leads -->
                            {#if expandedUsers[userGroup.userId]}
                                <div class="p-3 bg-light border-top">
                                    <div class="table-responsive bg-white rounded border">
                                        <table class="table table-hover table-striped mb-0 text-sm">
                                            <thead class="table-light">
                                                <tr>
                                                    <th class="px-3 py-2" style="width: 75px;">ID</th>
                                                    <th class="px-3 py-2" style="width: 85px;">Title</th>
                                                    <th class="px-3 py-2" style="width: 125px;">Created</th>
                                                    <th class="px-3 py-2" style="width: 125px;">Closed</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each userGroup.leads as lead}
                                                    <tr>
                                                        <td class="px-3 py-2 fw-medium text-nowrap">
                                                            <a href="{BASE_URL}{lead.ID}/" target="_blank" class="text-decoration-none">#{lead.ID}</a>
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap">
                                                            <a href="{BASE_URL}{lead.ID}/" target="_blank" class="text-decoration-none text-dark">{lead.TITLE || 'Unnamed Lead'}</a>
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap">
                                                            {dayjs(lead.DATE_CREATE).format('DD.MM.YYYY')}
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap">
                                                            {dayjs(lead.DATE_MODIFY).format('DD.MM.YYYY')}
                                                        </td>
                                                    </tr>
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
