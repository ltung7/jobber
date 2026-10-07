import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bitrixService from '$lib/bitrix/bitrix.service';
import dayjs from 'dayjs';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    let monthParam = url.searchParams.get('month');
    let yearParam = url.searchParams.get('year');

    let targetDate = dayjs();
    
    // Determine target month based on query params
    if (yearParam && monthParam) {
        targetDate = dayjs(`${yearParam}-${monthParam.padStart(2, '0')}-01`);
    } else if (monthParam && monthParam.includes('-')) {
        targetDate = dayjs(monthParam);
    } else {
        targetDate = targetDate.subtract(1, 'month');
    }

    // Determine selected month boundaries (e.g. October 1 to October 31)
    const selectedMonthStart = targetDate.startOf('month').format('YYYY-MM-DD');
    const selectedMonthEnd = targetDate.endOf('month').format('YYYY-MM-DD');

    // Determine evaluation period for all deals (From 2 months ago to yesterday, or end of next month)
    // "deals need to taken into account are all deals from 2 months ago up to this day"
    // So 2 months before the selected month start? Or 2 months from today?
    // "filter: start work last 2 month (from start to end)" -> Let's use 2 months prior to selectedMonthStart
    // and up to "today" or end of next month as requested ("october + next month or yesterday").
    
    const evalStart = targetDate.subtract(2, 'month').startOf('month').format('YYYY-MM-DD');
    
    // evaluation end is next month end, OR yesterday, whichever is earlier.
    const nextMonthEnd = targetDate.add(1, 'month').endOf('month');
    const yesterday = dayjs().subtract(1, 'day').endOf('day');
    const evalEnd = nextMonthEnd.isBefore(yesterday) 
        ? nextMonthEnd.format('YYYY-MM-DD')
        : yesterday.format('YYYY-MM-DD');

    try {
        // 1. Fetch Deals where Work Start is in the selected month
        const initialDeals = await bitrixService.getRecruiterDeals(selectedMonthStart, selectedMonthEnd);
        
        // Extract unique contact IDs
        const contactIds = Array.from(new Set(initialDeals.map(d => d.CONTACT_ID).filter(Boolean)));
        
        if (contactIds.length === 0) {
            return json({ contacts: [] });
        }

        // 2. Fetch ALL deals for these contacts within the expanded evaluation window
        const allDeals = await bitrixService.getDealsForContacts(contactIds as string[], evalStart, evalEnd);

        // 3. Fetch Contacts data
        const contactsData = await bitrixService.getContactsByIds(contactIds as string[]);
        
        // 4. Map and calculate
        const contactsMap = new Map();
        
        for (const c of contactsData) {
            contactsMap.set(String(c.ID), {
                id: c.ID,
                name: [c.NAME, c.SECOND_NAME, c.LAST_NAME].filter(Boolean).join(' '),
                recruiterId: c.UF_CRM_1790672831151 || 'Unassigned',
                deals: [],
                totalWorkedDays: 0,
                isSuccessful: false,
                startedInSelectedMonth: false
            });
        }

        const today = dayjs();

        for (const deal of allDeals) {
            if (!deal.CONTACT_ID) continue;
            const contactObj = contactsMap.get(String(deal.CONTACT_ID));
            if (!contactObj) continue;

            const workStartStr = deal.UF_CRM_1787746162988;
            if (!workStartStr) continue;

            const workStart = dayjs(workStartStr);
            let workEnd = deal.UF_CRM_1787746186953 ? dayjs(deal.UF_CRM_1787746186953) : today;
            
            // if workEnd is in the future relative to today, cap it at today? 
            // the requirement says empty work end means person works to this day.
            if (workEnd.isAfter(today)) {
                workEnd = today;
            }

            // Calculate days (End Date - Start Date) + 1 maybe? Let's do diff in days.
            const days = workEnd.diff(workStart, 'day');
            // If they started and ended same day, is that 0 or 1? Let's say diff is fine, or diff + 1 if needed.
            // "minimum 30 worked days" -> we will just use standard diff.
            
            const dealDays = Math.max(0, days);

            contactObj.deals.push({
                id: deal.ID,
                title: deal.TITLE,
                workStart: workStartStr,
                workEnd: deal.UF_CRM_1787746186953 || null,
                days: dealDays
            });

            contactObj.totalWorkedDays += dealDays;

            // Check if this specific deal started in the selected month
            if (workStart.format('YYYY-MM') === targetDate.format('YYYY-MM')) {
                contactObj.startedInSelectedMonth = true;
            }
        }

        const finalContacts = Array.from(contactsMap.values())
            .filter(c => c.startedInSelectedMonth) // Only show contacts that ACTUALLY started in selected month
            .map(c => {
                c.isSuccessful = c.totalWorkedDays >= 30;
                return c;
            });

        setHeaders({
            "cache-control": "max-age=300"
        });

        return json({ contacts: finalContacts });
    } catch (error) {
        console.error('Error fetching recruiter analytics:', error);
        return json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
};
