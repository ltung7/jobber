/*eslint @typescript-eslint/no-unused-vars: "off"*/
import sql from 'sql-bricks';
import firebaseAdmin from 'firebase-admin';
import type { RequestEvent } from './$types';
import { json } from '@sveltejs/kit';
import { NODE_ENV } from "$env/static/private"
import { readFile, writeFile } from "fs/promises"
import { dumpAxiosError, logger, thrower } from '$lib/utils/logger';
import loadJson from '$lib/utils/loadJson';
import saveJson from '$lib/utils/saveJson';
import { findJobberOffersList, getJobberOffersList, setJobberOffersList } from '$lib/server/db/firebase/jobber.fdb';


const runApiTest = async () => {
    // const list:Array<Partial<SavedOffer>> = await findJobberOffersList();
    const list:Array<Partial<SavedOffer>> = await loadJson('jobbersmod');
    // await saveJson(list, 'jobbers')

    for (let item of list) {
        const { id, ...data } = item;
        await setJobberOffersList(id!, data)
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

export const POST = async () => {
    if (NODE_ENV !== 'development') throw new Error('ERROR');
    try {
        logger.warn("Empty code")
    } catch (err: unknown) {
        logger.error(err);

    }
    return json({ success: true });
}

export const DELETE = async ({ url }: RequestEvent) => {
    if (NODE_ENV !== 'development') throw new Error('ERROR');
    const data = {}
    // data.del = await resetPickerData(PICKER_ACCOUNT);
    return json({ success: true, data });
}