import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { processDocusignWebhook } from '$lib/server/services/docusign/docusignWebhook.service';

export const POST = async ({ request }: RequestEvent) => {
    try {
        const payload = await request.json();
        // Run processing asynchronously or await it
        await processDocusignWebhook(payload);
        return json({ success: true });
    } catch (err: any) {
        console.error('Error in DocuSign webhook handler', err);
        return json({ success: false, error: err?.message || 'Webhook processing failed' }, { status: 500 });
    }
};
