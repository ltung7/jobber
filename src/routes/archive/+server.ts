import { addArchivedOffersList, archiveJobberOfferList, findArchivedOffersList, unarchiveJobberOfferList } from '$lib/server/db/firebase/jobber.fdb';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getArchivedOffersList } from '$lib/server/db/firebase/jobber.fdb';

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

export const DELETE = async ({ url }: RequestEvent) => {
    const id = url.searchParams.get('id')
    if (id?.length !== 20) throw error(400, 'Invalid offer Id')
    const offer = await getArchivedOffersList(id)
    if (!offer) throw error(400, 'Offer not found')
    await unarchiveJobberOfferList(offer);
    return json({ offer, success: true })
}
