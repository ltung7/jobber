import { addJobberOffersList, deleteJobberOfferList, findJobberOffersList, getJobberOffersList, setJobberOffersList } from '$lib/server/db/firebase/jobber.fdb';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const GET = async () => {
    const offers = await findJobberOffersList();
    return json({ offers })
}

export const POST = async ({ request }: RequestEvent) => {
    const { id: existingId, ...data } = await request.json();
    if (existingId?.length) {
        await setJobberOffersList(existingId, data);
        return json({ id: existingId, success: true })
    }
    
    const id = await addJobberOffersList(data)
    return json({ id, success: true })
}

export const PATCH = async ({ request }: RequestEvent) => {
    const { id, ...data } = await request.json();
    if (!id) throw error(400, 'Invalid request')
    await setJobberOffersList(id, data);
    return json({ id, success: true })
}

export const DELETE = async ({ url }: RequestEvent) => {
    const id = url.searchParams.get('id')
    if (!id?.length) throw error(400, 'Invalid request')
    const item = await getJobberOffersList(id)
    if (!item) throw error(400, 'Item not found');

    await deleteJobberOfferList(item);
    return json({ id, success: true })
}
