import type { Signer, EnvelopeDefinition, EnvelopeRecipientTabs, CarbonCopy } from "docusign-esign";
import { getDocusignApi } from "./docusign.token";
import { thrower } from "$lib/utils/logger";

export const signTabPage = (anchorOrPage: string | number = '\\s1\\', leftSide = false): EnvelopeRecipientTabs => {
    if (typeof anchorOrPage === 'number') {
        return {
            signHereTabs: [ {
                documentId: '1',
                pageNumber: anchorOrPage.toString(),
                yPosition: '760',
                xPosition: leftSide ? '120' : '400'
            } ]
        };
    }
    return {
        signHereTabs: [ {
            documentId: '1',
            anchorString: anchorOrPage,
            anchorUnits: 'pixels',
            anchorXOffset: '0',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'true'
        } ]
    };
};

export interface SignerData {
    email?: string;
    name: string;
    phone?: string;
    countryCode?: string;
    deliveryMethod?: 'email' | 'SMS';
}

export interface CarbonCopyData {
    email: string;
    name: string;
}

export interface SendEnvelopeParameters {
    buffer: Buffer;
    name: string;
    page?: number;
    rightSigner: SignerData;
    metadata?: Record<string, string>;
    leftSigner?: SignerData;
    carbonCopies?: CarbonCopyData[];
    useAnchor?: boolean;
}

function parsePhoneNumber(rawPhone?: string, countryCode?: string): { countryCode: string; number: string } | null {
    if (!rawPhone) return null;
    const cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (!cleaned) return null;

    if (cleaned.startsWith('+')) {
        const digits = cleaned.substring(1);
        if (digits.startsWith('48') && digits.length > 2) {
            return { countryCode: '48', number: digits.substring(2) };
        }
        return { countryCode: countryCode || digits.substring(0, 2), number: digits.substring(2) };
    }

    if (cleaned.startsWith('48') && cleaned.length >= 11) {
        return { countryCode: '48', number: cleaned.substring(2) };
    }

    return { countryCode: countryCode || '48', number: cleaned };
}

function buildSigner(data: SignerData, recipientId: string, routingOrder: string, defaultAnchor: string, page?: number, useAnchor: boolean = true): Signer {
    const tabs = useAnchor ? signTabPage(defaultAnchor) : signTabPage(page ?? 1, recipientId === '1');
    const isSms = data.deliveryMethod === 'SMS' || (!data.email && Boolean(data.phone));
    const parsedPhone = parsePhoneNumber(data.phone, data.countryCode);

    const signer: Signer = {
        name: data.name,
        recipientId,
        routingOrder,
        tabs,
        deliveryMethod: isSms ? 'SMS' : 'email'
    };

    if (data.email) {
        signer.email = data.email;
    }

    if (parsedPhone) {
        (signer as any).phoneNumber = parsedPhone;
        if (isSms) {
            (signer as any).additionalNotifications = [
                {
                    deliveryMethod: 'SMS',
                    phoneNumber: parsedPhone
                }
            ];
        }
    }

    return signer;
}

// --- Build envelope with signers and optional CC ---
export async function sendEnvelope({
    buffer,
    name,
    rightSigner,
    leftSigner,
    metadata,
    page = 1,
    carbonCopies,
    useAnchor = true
}: SendEnvelopeParameters) {
    const signers: Signer[] = [];

    if (leftSigner) {
        signers.push(buildSigner(leftSigner, '1', '1', '\\s1\\', page, useAnchor));
    }

    const rightRecipientId = leftSigner ? '2' : '1';
    signers.push(buildSigner(rightSigner, rightRecipientId, rightRecipientId, '\\s2\\', page, useAnchor));

    const envelopeDefinition: EnvelopeDefinition = {
        emailSubject: name,
        recipients: { signers },
        documents: [ {
            documentBase64: buffer.toString("base64"),
            name,
            fileExtension: "pdf",
            documentId: "1",
        } ],
        status: 'sent',
    };

    if (carbonCopies && carbonCopies.length > 0) {
        const ccSigners: CarbonCopy[] = carbonCopies.map((cc, idx) => ({
            email: cc.email,
            name: cc.name,
            recipientId: String(signers.length + idx + 1),
            routingOrder: String(signers.length + idx + 1)
        }));
        envelopeDefinition.recipients!.carbonCopies = ccSigners;
    }

    if (metadata) {
        const entries = Object.entries(metadata);
        if (entries.length) {
            envelopeDefinition.customFields = {
                textCustomFields: entries.map(([ name, value ]) => ({
                    name, value, show: 'false'
                }))
            };
        }
    }

    const { envelopesApi, accountId } = await getDocusignApi();
    try {
        const results = await envelopesApi.createEnvelope(accountId, {
            envelopeDefinition,
        });

        return results;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export async function getEnvelopeStatus(envelopeId: string) {
    const { envelopesApi, accountId } = await getDocusignApi();
    try {
        return await envelopesApi.getEnvelope(accountId, envelopeId);
    } catch (err) {
        thrower.axios(err, 'DocuSignGetEnvelope');
    }
}

export async function resendEnvelope(envelopeId: string) {
    const { envelopesApi, accountId } = await getDocusignApi();

    const options = {
        resendEnvelope: 'true'
    };

    try {
        const updateSummary = await envelopesApi.updateRecipients(accountId, envelopeId, options);
        return updateSummary;
    } catch (err) {
        thrower.axios(err, 'DocuSignResend');
    }
}
