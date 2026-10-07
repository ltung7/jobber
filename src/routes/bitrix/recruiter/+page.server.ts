import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import bitrixService from '$lib/bitrix/bitrix.service';

export const load: PageServerLoad = async ({ url }) => {
    // Determine the month and year requested by the user, defaulting to the previous calendar month
    const defaultDate = dayjs().subtract(1, 'month');
    const selectedMonth = url.searchParams.get('month') || defaultDate.format('MM');
    const selectedYear = url.searchParams.get('year') || defaultDate.format('YYYY');

    // Fetch the Recruiter field metadata to map the choice IDs to human-readable names
    let recruiterOptions: Record<string, string> = {};
    try {
        const contactFields = await bitrixService.getContactFieldsList();
        const recruiterField = contactFields.find(f => f.key === 'UF_CRM_1790672831151');
        
        if (recruiterField && recruiterField.items) {
            for (const item of recruiterField.items) {
                recruiterOptions[String(item.ID)] = item.VALUE;
            }
        }
    } catch (e) {
        console.error("Failed to load recruiter field options", e);
    }

    return {
        selectedMonth,
        selectedYear,
        recruiterOptions
    };
};
