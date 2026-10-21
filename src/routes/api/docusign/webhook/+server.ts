import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { processDocusignWebhook } from '$lib/server/services/docusign/docusignWebhook.service';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

export const POST = async ({ request }: RequestEvent) => {
    try {
        const rawText = await request.text();
        let payload: any;

        if (rawText.trim().startsWith('<')) {
            // Legacy / Connect XML payload
            const parsedXml = xmlParser.parse(rawText);
            const statusMessage = parsedXml?.DocuSignEnvelopeInformation || parsedXml;
            const envelopeStatus = statusMessage?.EnvelopeStatus;

            payload = {
                event: envelopeStatus?.Status ? `envelope-${envelopeStatus.Status.toLowerCase()}` : 'envelope-updated',
                data: {
                    envelopeId: envelopeStatus?.EnvelopeID || statusMessage?.EnvelopeID,
                    envelopeSummary: {
                        status: envelopeStatus?.Status?.toLowerCase(),
                        completedDateTime: envelopeStatus?.Completed,
                        emailSubject: envelopeStatus?.Subject
                    }
                },
                _rawXml: true,
                _rawXmlSnippet: rawText.slice(0, 800)
            };
        } else {
            // Modern DocuSign Connect REST JSON payload (SIM)
            payload = JSON.parse(rawText);
        }

        await processDocusignWebhook(payload);
        return json({ success: true });
    } catch (err: any) {
        console.error('Error in DocuSign webhook handler', err);
        return json({ success: false, error: err?.message || 'Webhook processing failed' }, { status: 500 });
    }
};
