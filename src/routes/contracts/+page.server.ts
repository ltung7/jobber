import type { PageServerLoad } from './$types';
import { findContracts } from '$lib/server/db/firebase/recruiterContract.fdb';
import { findEnvelopes } from '$lib/server/db/firebase/recruiterEnvelope.fdb';
import { findContractors, ensureDefaultContractor } from '$lib/server/db/firebase/recruiterContractor.fdb';
import { findContractees } from '$lib/server/db/firebase/recruiterContractee.fdb';
import bitrixService from '$lib/bitrix/bitrix.service';

export const load: PageServerLoad = async () => {
    let contracts: any[] = [];
    let envelopes: any[] = [];
    let contractors: any[] = [];
    let contractees: any[] = [];
    let recruiterOptions: Record<string, string> = {};

    try {
        contracts = await findContracts();
    } catch (e) {
        console.error('Failed to load contracts', e);
    }

    try {
        envelopes = await findEnvelopes();
        envelopes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (e) {
        console.error('Failed to load envelopes', e);
    }

    try {
        contractors = await findContractors();
        if (contractors.length === 0) {
            await ensureDefaultContractor();
            contractors = await findContractors();
        }
    } catch (e) {
        console.error('Failed to load contractors', e);
    }

    try {
        contractees = await findContractees();
        contractees.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (e) {
        console.error('Failed to load contractees', e);
    }

    try {
        const contactFields = await bitrixService.getContactFieldsList();
        const recruiterField = contactFields.find(f => f.key === 'UF_CRM_1790672831151');
        if (recruiterField && recruiterField.items) {
            for (const item of recruiterField.items) {
                recruiterOptions[String(item.ID)] = item.VALUE;
            }
        }
    } catch (e) {
        console.error('Failed to load recruiter options', e);
    }

    return {
        contracts,
        envelopes,
        contractors,
        contractees,
        recruiterOptions
    };
};
