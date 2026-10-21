import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getEnvelope, getEnvelopeByDocuSignId } from '$lib/server/db/firebase/recruiterEnvelope.fdb';
import { resendEnvelope } from '$lib/server/services/docusign/docusign.service';

export const POST = async ({ params }: RequestEvent) => {
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

        const result = await resendEnvelope(envelope.envelopeId);
        return json({ success: true, result });
    } catch (err: any) {
        console.error('Failed to resend envelope:', err);
        throw error(500, err?.message || 'Failed to resend envelope');
    }
};
