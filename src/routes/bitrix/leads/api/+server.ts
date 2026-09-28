import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bitrixService from '$lib/bitrix/bitrix.service';
import dayjs from 'dayjs';
import saveJson from '$lib/utils/saveJson';

export const GET: RequestHandler = async ({ url }) => {
    let monthParam = url.searchParams.get('month');
    let yearParam = url.searchParams.get('year');

    let targetDate = dayjs();
    
    // Determine target month based on query params (same logic as page.server.ts fallback)
    if (yearParam && monthParam) {
        targetDate = dayjs(`${yearParam}-${monthParam.padStart(2, '0')}-01`);
    } else if (monthParam && monthParam.includes('-')) {
        targetDate = dayjs(monthParam);
    } else {
        targetDate = targetDate.subtract(1, 'month');
    }

    // Determine exact start and end boundaries for the month
    const startDate = targetDate.startOf('month').format();
    const endDate = targetDate.endOf('month').format();

    // Fetch the leads
    try {
        const leads = await bitrixService.getClosedLeads(startDate, endDate);
        await saveJson(leads, 'btx-leads-' + startDate.substring(0, 10))
        return json({ leads });
    } catch (error) {
        console.error('Error fetching leads from Bitrix:', error);
        return json({ error: 'Failed to fetch leads' }, { status: 500 });
    }
};