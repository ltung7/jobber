import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import {
    addContract,
    deleteContract,
    findContracts,
    getContract,
    setContract
} from '$lib/server/db/firebase/recruiterContract.fdb';
import { findEnvelopes } from '$lib/server/db/firebase/recruiterEnvelope.fdb';

export const GET = async ({ url }: RequestEvent) => {
    const type = url.searchParams.get('type');

    try {
        if (type === 'envelopes') {
            const envelopes = await findEnvelopes();
            envelopes.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return json({ envelopes });
        }

        const contracts = await findContracts();
        return json({ contracts });
    } catch (err: any) {
        throw error(500, err?.message || 'Failed to fetch data');
    }
};

export const POST = async ({ request }: RequestEvent) => {
    const data = await request.json();
    const { id, ...rest } = data;

    if (!rest.title) {
        throw error(400, 'Title is required');
    }

    try {
        if (id) {
            await setContract(id, rest);
            return json({ id, success: true });
        } else {
            const newId = await addContract(rest);
            return json({ id: newId, success: true });
        }
    } catch (err: any) {
        throw error(500, err?.message || 'Failed to save contract');
    }
};

export const DELETE = async ({ url }: RequestEvent) => {
    const id = url.searchParams.get('id');
    if (!id) throw error(400, 'Contract ID is required');

    const existing = await getContract(id);
    if (!existing) throw error(404, 'Contract not found');

    try {
        await deleteContract(id);
        return json({ id, success: true });
    } catch (err: any) {
        throw error(500, err?.message || 'Failed to delete contract');
    }
};
