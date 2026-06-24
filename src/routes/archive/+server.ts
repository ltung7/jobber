import { addArchivedOffersList, archiveJobberOfferList, findArchivedOffersList } from '$lib/server/db/firebase/jobber.fdb';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const GET = async () => {
    const archives = await findArchivedOffersList()
    return json({ archives, success: true })
}

export const POST = async ({ request }: RequestEvent) => {
    const data = await request.json();
    const id = await addArchivedOffersList(data)
    return json({ id, success: true })
}

export const PATCH = async ({ request }: RequestEvent) => {
    const offer = await request.json();
    if (!offer.id) throw error(400, 'Invalid request');
    await archiveJobberOfferList(offer)
    return json({ id: offer.id, success: true })
}
