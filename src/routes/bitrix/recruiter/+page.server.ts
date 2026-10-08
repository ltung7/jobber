import type { PageServerLoad } from './$types';
import dayjs from 'dayjs';
import bitrixService from '$lib/bitrix/bitrix.service';

export const load: PageServerLoad = async ({ url }) => {
    // Determine the month and year requested by the user, defaulting to 2 months ago (ready to calculate provision)
    const defaultDate = dayjs().subtract(2, 'month');
    const selectedMonth = url.searchParams.get('month') || defaultDate.format('MM');
    const selectedYear = url.searchParams.get('year') || defaultDate.format('YYYY');

    // Fetch the Recruiter field metadata to map the choice IDs to human-readable names
    let recruiterOptions: Record<string, string> = {};
    let projectOptions: Record<string, string> = {};
    
    try {
        const contactFields = await bitrixService.getContactFieldsList();
        const recruiterField = contactFields.find(f => f.key === 'UF_CRM_1790672831151');
        
        if (recruiterField && recruiterField.items) {
            for (const item of recruiterField.items) {
                recruiterOptions[String(item.ID)] = item.VALUE;
            }
        }
        
        const dealFields = await bitrixService.getDealFields();
        const projectField = dealFields['UF_CRM_1787822368903'];
        
        if (projectField && projectField.items) {
            for (const item of projectField.items) {
                projectOptions[String(item.ID)] = item.VALUE;
            }
        }
    } catch (e) {
        console.error("Failed to load field options", e);
    }

    return {
        selectedMonth,
        selectedYear,
        recruiterOptions,
        projectOptions
    };
};
