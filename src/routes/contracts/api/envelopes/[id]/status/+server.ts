import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getEnvelope, getEnvelopeByDocuSignId } from '$lib/server/db/firebase/recruiterEnvelope.fdb';
import { syncEnvelopeStatus } from '$lib/server/services/docusign/docusignWebhook.service';

export const GET = async ({ params }: RequestEvent) => {
    const id = params.id;
    if (!id) throw error(400, 'Envelope ID is required');

    try {
        let envelope = await getEnvelopeByDocuSignId(id);
        if (!envelope) {
            envelope = await getEnvelope(id);
        }
        if (!envelope) {
            throw error(404, 'Envelope not found in database');
        }

        const updated = await syncEnvelopeStatus(envelope.envelopeId);
        return json({ success: true, envelope: updated });
    } catch (err: any) {
        console.error('Failed to sync envelope status:', err);
        throw error(500, err?.message || 'Failed to sync envelope status');
    }
};

export const POST = GET;
