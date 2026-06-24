import { getSettings, setSettings } from '$lib/server/db/firebase/settings.fdb';
import type { RequestEvent } from './$types';
import { json } from '@sveltejs/kit';

export const GET = async () => {
    const settings = await getSettings();
    return json({ success: true, settings })
}

export const PATCH = async ({ request }: RequestEvent) => {
    const data = await request.json();
    await setSettings(data)
    return json({ success: true })
}