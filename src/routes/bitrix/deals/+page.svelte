<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { internal } from '$lib/nav/internal';
    import dayjs from 'dayjs';
    import type { BitrixDeal } from '$lib/bitrix/bitrix.d';

    const BASE_URL = 'https://eisg.bitrix24.pl/crm/deal/details/';

    let { data } = $props();
    
    // Internal state for selected period and fetching
    let selectedYear = $state(untrack(() => data.selectedYear));
    let selectedMonth = $state(untrack(() => data.selectedMonth));
    let filterBy = $state('workStart');
    let deals = $state<BitrixDeal[]>([]);
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

    // Fetch deals through our client-side internal.getApi wrapper
    async function fetchDeals(year: string, month: string, filterBy: string) {
        loading = true;
        try {
            // internal.getApi appends '/api' to current pathname, routing to our new +server.ts
            const response: any = await internal.getApi({ year, month, filterBy });
            if (response && response.deals) {
                deals = response.deals;
            } else {
                deals = [];
            }
        } catch (err) {
            console.error("Failed to fetch deals", err);
            deals = [];
        } finally {
            loading = false;
        }
    }

    function selectMonth(year: string, month: string) {
        selectedYear = year;
        selectedMonth = month;
        fetchDeals(year, month, filterBy);
    }
    
    function selectFilterBy(filter: string) {
        filterBy = filter;
        fetchDeals(selectedYear, selectedMonth, filterBy);
    }

    function toggleExpand(userId: string) {
        expandedUsers[userId] = !expandedUsers[userId];
    }

    // Trigger initial fetch when page mounts
    onMount(() => {
        fetchDeals(selectedYear, selectedMonth, filterBy);
    });

    // Aggregate data grouped by user using Svelte 5 $derived.by rune
    let aggregated = $derived.by(() => {
        const grouped: Record<string, any> = {};
        
        for (const deal of deals) {
            const uId = deal.ASSIGNED_BY_ID;
            
            if (!grouped[uId]) {
                grouped[uId] = {
                    userId: uId,
                    userName: data.userMap.get(uId) || 'Unknown User',
                    deals: [],
                    totalClosed: 0,
                    totalValue: 0
                };
            }
            
            grouped[uId].deals.push(deal);
            grouped[uId].totalClosed++;
            grouped[uId].totalValue += Number(deal.OPPORTUNITY || 0);
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

        <!-- RIGHT COLUMN: Deals List Group -->
        <div class="col-md-9 col-lg-10">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="fw-bold mb-0">Deals Performance</h4>
                <div class="btn-group shadow-sm" role="group" aria-label="Filter mode">
                    <button 
                        type="button" 
                        class="btn {filterBy === 'closeDate' ? 'btn-primary' : 'btn-outline-secondary'}" 
                        onclick={() => selectFilterBy('closeDate')}
                    >
                        By Close Date
                    </button>
                    <button 
                        type="button" 
                        class="btn {filterBy === 'workStart' ? 'btn-primary' : 'btn-outline-secondary'}" 
                        onclick={() => selectFilterBy('workStart')}
                    >
                        By Work Start
                    </button>
                </div>
            </div>
            
            {#if loading}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>Loading deals data for selected period...</div>
                </div>
            {:else if aggregated.length === 0}
                <div class="p-5 text-center text-muted bg-light border rounded shadow-sm">
                    No deals found for this period.
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
                                        {userGroup.totalClosed} Deals
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

                            <!-- Expandable Table of User's Deals -->
                            {#if expandedUsers[userGroup.userId]}
                                <div class="p-3 bg-light border-top">
                                    <div class="table-responsive bg-white rounded border">
                                        <table class="table table-hover table-striped mb-0 text-sm">
                                            <thead class="table-light">
                                                <tr>
                                                    <th class="px-3 py-2" style="width: 75px;">ID</th>
                                                    <th class="px-3 py-2" style="width: 85px;">Title</th>
                                                    <th class="px-3 py-2">Name</th>
                                                    <th class="px-3 py-2" style="width: 125px;">Work Start</th>
                                                    <th class="px-3 py-2" style="width: 125px;">Work End</th>
                                                    <th class="px-3 py-2" style="width: 125px;">Closed</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each userGroup.deals as deal}
                                                    <tr>
                                                        <td class="px-3 py-2 fw-medium text-nowrap text-center">
                                                            <a href="{BASE_URL}{deal.ID}/" target="_blank" class="text-decoration-none">#{deal.ID}</a>
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap text-center">
                                                            <a href="{BASE_URL}{deal.ID}/" target="_blank" class="text-decoration-none text-dark">{deal.TITLE || 'Unnamed Deal'}</a>
                                                        </td>
                                                        <td class="px-3 py-2">
                                                            {[deal.UF_CRM_1787745014165, deal.UF_CRM_1787745029864].filter(Boolean).join(' ') || '-'}
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap text-center">
                                                            {deal.UF_CRM_1787746162988 ? dayjs(deal.UF_CRM_1787746162988).format('DD.MM.YYYY') : '-'}
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap text-center">
                                                            {deal.UF_CRM_1787746186953 ? dayjs(deal.UF_CRM_1787746186953).format('DD.MM.YYYY') : '-'}
                                                        </td>
                                                        <td class="px-3 py-2 text-nowrap text-center">
                                                            {dayjs(deal.CLOSEDATE || deal.DATE_MODIFY).format('DD.MM.YYYY')}
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
