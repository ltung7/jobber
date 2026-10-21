/*eslint @typescript-eslint/no-unused-vars: "off"*/
import axios from 'axios';
import firebaseAdmin from 'firebase-admin';
import type { RequestEvent } from './$types';
import { json } from '@sveltejs/kit';
import { NODE_ENV } from "$env/static/private"
import { readFile, writeFile } from "fs/promises"
import { dumpAxiosError, logger, thrower } from '$lib/utils/logger';
import loadJson from '$lib/utils/loadJson';
import saveJson from '$lib/utils/saveJson';
import bitrixService, { calculateFieldStatistics } from '$lib/bitrix/bitrix.service';
import { backupFirebaseData, restoreFirebaseData } from '$lib/server/services/backup.service';


const runApiTest = async () => {
    // const [ leadFields, dealFields, contactFields ] = await Promise.all([
    //     bitrixService.getLeadFields({ saveToFile: true }),
    //     bitrixService.getDealFields({ saveToFile: true }),
    //     bitrixService.getContactFields({ saveToFile: true })
    // ])
    // await saveJson({ leads: leadFields, deals: dealFields, contacts: contactFields }, 'fieldDefinitions')
    
    // const leadStats = calculateFieldStatistics()

    // return { leadFields, dealFields, contactFields }

    // const contactStats = await bitrixService.getContactsFieldStatistics([ 'UF_CRM_6A78301F5C2B9', 'UF_CRM_6A78301F64C93', 'UF_CRM_1790756177386', 'UF_CRM_1790672831151'])
    // await saveJson(contactStats, 'contactStats')

    // const leadStats = await bitrixService.getLeadsFieldStatistics([ 'UF_CRM_1784808947693', 'UF_CRM_1784808962994', 'UF_CRM_1788853850535'])
    // await saveJson(leadStats, 'leadStats')

    // const dealStats = await bitrixService.getDealsFieldStatistics([ 'UF_CRM_1790681629518', 'UF_CRM_6ABB729E3DEEB', 'UF_CRM_6A78301FABA8D'])
    // await saveJson(dealStats, 'dealsStats')

    // await backupFirebaseData('offers-bkp')
    // await restoreFirebaseData('offers-bkp')

    // Manual test for src/routes/contracts/api/envelopes/+server.ts via Axios
    const payload = await loadJson('1792588252071');
    const targetUrl = 'http://localhost:5173/contracts/api/envelopes';
    
    try {
        const axiosResponse = await axios.post(targetUrl, payload);
        return {
            testName: 'envelopes POST endpoint axios test',
            payloadSummary: {
                contractTitle: payload.contractTitle,
                receiver: payload.receiver?.name
            },
            responseStatus: axiosResponse.status,
            result: axiosResponse.data
        };
    } catch (err: any) {
        // dumpAxiosError(err);
        // throw err;
    }
}






export const GET = async ({ url }: RequestEvent) => {
    if (NODE_ENV !== 'development') throw new Error('ERROR');
    try {
        const data = await runApiTest() as ExplicitAnyToTest;
        if (data instanceof Response) return data;
        return json({ success: true, data });
    } catch (err: unknown) {
        return thrower.endpointSoft(err, true);
    }
}

export const POST = async ({ request }: RequestEvent) => {
    if (NODE_ENV !== 'development') throw new Error('ERROR');
    try {
        const data = await runApiTest() as ExplicitAnyToTest;
        if (data instanceof Response) return data;
        return json({ success: true, data });
    } catch (err: unknown) {
        return thrower.endpointSoft(err, true);
    }
}

export const DELETE = async ({ url }: RequestEvent) => {
    if (NODE_ENV !== 'development') throw new Error('ERROR');
    const data = {}
    // data.del = await resetPickerData(PICKER_ACCOUNT);
    return json({ success: true, data });
}