import axios from 'axios';
import { BITRIX24_WEBHOOK_URL } from '$env/static/private';
import type { BitrixDeal, BitrixLead, BitrixUser } from './bitrix.d';

// Ensure the base URL has a trailing slash to prevent routing issues in Axios
const baseURL = BITRIX24_WEBHOOK_URL.endsWith('/') 
    ? BITRIX24_WEBHOOK_URL 
    : `${BITRIX24_WEBHOOK_URL}/`;

const client = axios.create({
    baseURL
});

/**
 * Utility to handle Bitrix24's 50-item pagination limit.
 * It will recursively fetch all items until the 'next' parameter is exhausted.
 */
async function fetchPaginated<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    let allResults: T[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await client.post(`${endpoint}.json`, {
            ...params,
            start
        });

        const data = response.data;

        if (data.result && Array.isArray(data.result)) {
            allResults = allResults.concat(data.result);
        }

        // Bitrix returns a 'next' property when there are more results
        if (data.next) {
            start = data.next;
        } else {
            hasMore = false;
        }
    }

    return allResults;
}

const bitrixService = {
    /**
     * Fetch all active users from Bitrix24 to map IDs to names.
     */
    async getUsers(): Promise<BitrixUser[]> {
        return fetchPaginated<BitrixUser>('user.get', {
            // Optional: filter for active users only
            ACTIVE: true 
        });
    },

    /**
     * Fetch all leads modified/closed within a specific date range.
     * We filter by STATUS_ID = 'CONVERTED' assuming this is your standard closed status.
     * (You can adjust the STATUS_ID depending on your portal's specific setup).
     */
    async getClosedLeads(startDate: string, endDate: string): Promise<BitrixLead[]> {
        return fetchPaginated<BitrixLead>('crm.lead.list', {
            filter: {
                '>=DATE_MODIFY': startDate,
                '<=DATE_MODIFY': endDate,
                // Adjust this if your successful close status is named differently
                'STATUS_ID': 'CONVERTED'
            },
            select: [
                'ID',
                'TITLE',
                'STATUS_ID',
                'ASSIGNED_BY_ID',
                'OPPORTUNITY',
                'CURRENCY_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'DATE_CLOSED'
            ]
        });
    },

    /**
     * Fetch all deals within a specific date range (based on the selected dateField).
     */
    async getClosedDeals(startDate: string, endDate: string, dateField: string = 'CLOSEDATE'): Promise<BitrixDeal[]> {
        return fetchPaginated<BitrixDeal>('crm.deal.list', {
            filter: {
                [`>=${dateField}`]: startDate,
                [`<=${dateField}`]: endDate
            },
            select: [
                'ID',
                'TITLE',
                'STAGE_ID',
                'ASSIGNED_BY_ID',
                'OPPORTUNITY',
                'CURRENCY_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'BEGINDATE',
                'CLOSEDATE',
                'UF_CRM_1787745014165',
                'UF_CRM_1787745029864',
                'UF_CRM_1787746162988',
                'UF_CRM_1787746186953'
            ]
        });
    }
};

export default bitrixService;