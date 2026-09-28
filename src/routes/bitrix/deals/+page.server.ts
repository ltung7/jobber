import type { PageServerLoad } from './$types';
import bitrixService from '$lib/bitrix/bitrix.service';
import dayjs from 'dayjs';

export const load: PageServerLoad = async ({ url }) => {
    // 1. Get month from URL or default to previous month
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');

    let targetDate = dayjs();
    
    // If we have a year and a month parameter like '?year=2024&month=10'
    if (yearParam && monthParam) {
        // dayjs expects 'YYYY-MM' format, or we can use objects if we install the plugin, 
        // but string interpolation is safest here. Note: month is 0-indexed in standard JS, but 1-indexed in ISO string
        targetDate = dayjs(`${yearParam}-${monthParam.padStart(2, '0')}-01`);
    } else if (monthParam && monthParam.includes('-')) {
        // Fallback to our previous YYYY-MM parameter parsing
        targetDate = dayjs(monthParam);
    } else {
        // Default to the previous month
        targetDate = targetDate.subtract(1, 'month');
    }

    // Export both params cleanly to the frontend for the UI selectors
    const finalMonth = targetDate.format('MM');
    const finalYear = targetDate.format('YYYY');

    // 2. Fetch users on the server for fast mapping later
    const users = await bitrixService.getUsers();

    // Create a lookup map for faster mapping
    const userMap = new Map<string, string>();
    for (const user of users) {
        const fullName = [ user.NAME, user.LAST_NAME ].filter(Boolean).join(' ');
        userMap.set(user.ID, fullName);
    }

    // 3. Return the userMap and defaults
    // Leads are not fetched here anymore, they will be fetched client-side.
    return {
        userMap,
        selectedMonth: finalMonth,
        selectedYear: finalYear
    };
};
