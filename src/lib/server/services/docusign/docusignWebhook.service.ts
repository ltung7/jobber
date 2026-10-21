import type { DocusignWebhookEvent, EventCustomFields } from "./docusign";
import { isDev } from "$lib/utils/isDev";
import { logger, thrower } from "$lib/utils/logger";
import { getEnvelopeByDocuSignId, setEnvelope, type SentEnvelope } from "$lib/server/db/firebase/recruiterEnvelope.fdb";
import bitrixService from "$lib/bitrix/bitrix.service";
import { getEnvelopeStatus } from "./docusign.service";

const processContractEnvelope = async (payload: DocusignWebhookEvent<[EventCustomFields]>) => {
    const envelopeId = payload.data?.envelopeId;
    if (!envelopeId) return;

    const envelope = await getEnvelopeByDocuSignId(envelopeId);
    if (!envelope) return;

    let status = payload.data?.envelopeSummary?.status || envelope.status;
    if (payload.event === 'envelope-completed') {
        status = 'completed';
    } else if (payload.event === 'envelope-delivered') {
        status = 'delivered';
    } else if (payload.event === 'envelope-declined') {
        status = 'declined';
    } else if (payload.event === 'envelope-voided') {
        status = 'voided';
    }

    const isSigned = status === 'completed' || status === 'signed';
    const updateData: Partial<SentEnvelope> = {
        status: isSigned ? 'signed' : status,
        updatedAt: new Date().toISOString()
    };

    if (isSigned) {
        updateData.signedAt = payload.data?.envelopeSummary?.completedDateTime || new Date().toISOString();
        updateData.completedAt = updateData.signedAt;
    }

    if (envelope.id) {
        await setEnvelope(envelope.id, updateData);
    }

    // Bitrix Synchronization: When an envelope reaches "Signed" ("podpisana") status
    if (isSigned && envelope.bitrixContactId) {
        const comment = `[Umowa DocuSign: ${envelope.contractTitle || 'Umowa'}] Status: PODPISANA. Recommender Payout: 150 PLN po 30 dniach od zatrudnienia. Envelope ID: ${envelopeId}`;
        await bitrixService.addContactComment(envelope.bitrixContactId, comment);
    }
};

export const syncEnvelopeStatus = async (envelopeId: string) => {
    const envelope = await getEnvelopeByDocuSignId(envelopeId);
    if (!envelope) throw new Error('Envelope not found in database');

    const dsEnvelope = await getEnvelopeStatus(envelopeId);
    if (!dsEnvelope) throw new Error('Envelope not found in DocuSign');

    const status = dsEnvelope.status === 'completed' ? 'signed' : (dsEnvelope.status || envelope.status);
    const isSigned = status === 'signed' || status === 'completed';

    const updateData: Partial<SentEnvelope> = {
        status,
        updatedAt: new Date().toISOString()
    };

    if (isSigned) {
        updateData.signedAt = dsEnvelope.completedDateTime || new Date().toISOString();
        updateData.completedAt = updateData.signedAt;
    }

    if (envelope.id) {
        await setEnvelope(envelope.id, updateData);
    }

    if (isSigned && envelope.bitrixContactId && envelope.status !== 'signed' && envelope.status !== 'completed') {
        const comment = `[Umowa DocuSign: ${envelope.contractTitle || 'Umowa'}] Status: PODPISANA. Recommender Payout: 150 PLN po 30 dniach od zatrudnienia. Envelope ID: ${envelopeId}`;
        await bitrixService.addContactComment(envelope.bitrixContactId, comment);
    }

    return { ...envelope, ...updateData };
};

export const processDocusignWebhook = async (payload: DocusignWebhookEvent<[EventCustomFields]>) => {
    logger.log('DocusignWebhook ' + payload.event);

    try {
        await processContractEnvelope(payload);
    } catch (err) {
        if (isDev) console.error(err);
        else thrower.slack(err, 'DocusignWebhook');
    }
};
