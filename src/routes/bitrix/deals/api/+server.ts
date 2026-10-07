import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bitrixService from '$lib/bitrix/bitrix.service';
import dayjs from 'dayjs';
import saveJson from '$lib/utils/saveJson';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    let monthParam = url.searchParams.get('month');
    let yearParam = url.searchParams.get('year');
    let filterByParam = url.searchParams.get('filterBy');

    let targetDate = dayjs();
    
    // Determine target month based on query params (same logic as page.server.ts fallback)
    if (yearParam && monthParam) {
        targetDate = dayjs(`${yearParam}-${monthParam.padStart(2, '0')}-01`);
    } else if (monthParam && monthParam.includes('-')) {
        targetDate = dayjs(monthParam);
    } else {
        targetDate = targetDate.subtract(1, 'month');
    }

    // Determine exact start and end boundaries for the month using exact date string to avoid timezone bleeding
    const startDate = targetDate.startOf('month').format('YYYY-MM-DD');
    const endDate = targetDate.endOf('month').format('YYYY-MM-DD');

    // Map the 'filterBy' parameter to actual Bitrix fields
    // 'closeDate' -> 'CLOSEDATE'
    // defaults to 'UF_CRM_1787746162988' (workStart)
    const dateField = filterByParam === 'closeDate' ? 'CLOSEDATE' : 'UF_CRM_1787746162988';

    // Fetch the deals
    try {
        const deals = await bitrixService.getClosedDeals(startDate, endDate, dateField);
        await saveJson(deals, `btx-deals-${startDate.substring(0, 10)}-${dateField}`)

        setHeaders({
            "cache-control": "max-age=300"
        });

        return json({ deals });
    } catch (error) {
        console.error('Error fetching deals from Bitrix:', error);
        return json({ error: 'Failed to fetch deals' }, { status: 500 });
    }
};