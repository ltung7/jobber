import type { Signer, EnvelopeDefinition, EnvelopeRecipientTabs, CarbonCopy } from "docusign-esign";
import { getDocusignApi } from "./docusign.token";
import { thrower, logger } from "$lib/utils/logger";
import { isDev } from "$lib/utils/isDev";
import { writeFile, mkdir } from "fs/promises";
import { PDFDocument, rgb } from "pdf-lib";

const SIGN_TEST = false && isDev;

export const SIGN_COORDS = {
    left: { x: 120, y: 760 },
    right: { x: 400, y: 760 },
    width: 150,
    height: 50
};

export const signTabPage = (anchorOrPage: string | number = 1, leftSide = false, customCoords?: Coordinates): EnvelopeRecipientTabs => {
    if (typeof anchorOrPage === 'number') {
        const coords = customCoords || (leftSide ? SIGN_COORDS.left : SIGN_COORDS.right);
        return {
            signHereTabs: [{
                documentId: '1',
                pageNumber: anchorOrPage.toString(),
                yPosition: Math.round(coords.y).toString(),
                xPosition: Math.round(coords.x).toString()
            }]
        };
    }
    return {
        signHereTabs: [{
            documentId: '1',
            anchorString: anchorOrPage,
            anchorUnits: 'pixels',
            anchorXOffset: '0',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'false'
        }]
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

export interface Coordinates {
    x: number;
    y: number;
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
    leftCoords?: Coordinates;
    rightCoords?: Coordinates;
    webhookUrl?: string;
    replyTo?: {
        name: string;
        email: string;
    };
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

function buildSigner(data: SignerData, recipientId: string, routingOrder: string, defaultAnchor: string, page?: number, useAnchor: boolean = true, customCoords?: Coordinates): Signer {
    const tabs = useAnchor ? signTabPage(defaultAnchor) : signTabPage(page ?? 1, recipientId === '1', customCoords);
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

// Helper for visual coordinate debugging in development
async function drawSignatureDebugBoxes(pdfBuffer: Buffer, targetPageNumber: number, leftCoords?: Coordinates, rightCoords?: Coordinates): Promise<Buffer> {
    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const pageIdx = Math.min(Math.max(targetPageNumber - 1, 0), pages.length - 1);
        const page = pages[pageIdx];
        const { height } = page.getSize();

        const lCoords = leftCoords || SIGN_COORDS.left;
        const rCoords = rightCoords || SIGN_COORDS.right;

        // DocuSign coordinates: (0,0) is TOP-LEFT.
        // PDF-Lib coordinates: (0,0) is BOTTOM-LEFT.
        // pdfY = pageHeight - docusignY - boxHeight
        const leftPdfY = height - lCoords.y - SIGN_COORDS.height;
        const rightPdfY = height - rCoords.y - SIGN_COORDS.height;

        // Draw left signer box (Blue)
        page.drawRectangle({
            x: lCoords.x,
            y: leftPdfY,
            width: SIGN_COORDS.width,
            height: SIGN_COORDS.height,
            borderColor: rgb(0, 0.4, 0.9),
            borderWidth: 2,
            color: rgb(0, 0.4, 0.9),
            opacity: 0.15
        });

        // Draw right signer box (Green)
        page.drawRectangle({
            x: rCoords.x,
            y: rightPdfY,
            width: SIGN_COORDS.width,
            height: SIGN_COORDS.height,
            borderColor: rgb(0.1, 0.7, 0.2),
            borderWidth: 2,
            color: rgb(0.1, 0.7, 0.2),
            opacity: 0.15
        });

        const modifiedBytes = await pdfDoc.save();
        return Buffer.from(modifiedBytes);
    } catch (e) {
        console.error('Failed to draw signature debug boxes:', e);
        return pdfBuffer;
    }
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
    useAnchor = true,
    leftCoords,
    rightCoords,
    webhookUrl = 'https://manager.eisg.pl/api/docusign/webhook',
    replyTo
}: SendEnvelopeParameters) {
    if (SIGN_TEST) {
        console.log({ leftCoords, rightCoords })
        try {
            await mkdir('/tmp', { recursive: true });
        } catch {}
        const debugPdfBuffer = await drawSignatureDebugBoxes(buffer, page, leftCoords, rightCoords);
        const envelopeId = 'TEST-ENVELOPE-' + Date.now();
        await writeFile(`/tmp/${envelopeId}.pdf`, debugPdfBuffer);
        logger.log('[SIGN_TEST] Saved annotated test contract to /tmp/contract.pdf with sign boxes at coordinates.');
        return {
            envelopeId,
            status: 'sent'
        };
    }

    const signers: Signer[] = [];
    if (leftSigner) {
        signers.push(buildSigner(leftSigner, '1', '1', '\\s1\\', page, useAnchor, leftCoords));
    }

    const rightRecipientId = leftSigner ? '2' : '1';
    signers.push(buildSigner(rightSigner, rightRecipientId, rightRecipientId, '\\s2\\', page, useAnchor, rightCoords));

    const envelopeDefinition: EnvelopeDefinition = {
        emailSubject: name,
        recipients: { signers },
        documents: [{
            documentBase64: buffer.toString("base64"),
            name,
            fileExtension: "pdf",
            documentId: "1",
        }],
        status: 'sent',
    };

    if (replyTo?.email) {
        envelopeDefinition.emailSettings = {
            replyEmailAddressOverride: replyTo.email,
            replyEmailNameOverride: replyTo.name || replyTo.email
        };
    }

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
                textCustomFields: entries.map(([name, value]) => ({
                    name, value, show: 'false'
                }))
            };
        }
    }

    if (webhookUrl) {
        envelopeDefinition.eventNotification = {
            url: webhookUrl,
            loggingEnabled: 'true',
            requireAcknowledgment: 'true',
            eventData: {
                version: 'restv2.1',
                format: 'json',
                includeData: ['custom_fields', 'recipients', 'tabs']
            },
            useSoapInterface: 'false',
            includeCertificateWithSoap: 'false',
            includeDocuments: 'false',
            includeEnvelopeVoidReason: 'true',
            includeTimeZone: 'true',
            includeSenderAccountAsCustomField: 'true',
            includeDocumentFields: 'true',
            includeCertificateOfCompletion: 'false',
            envelopeEvents: [
                { envelopeEventStatusCode: 'sent' },
                { envelopeEventStatusCode: 'delivered' },
                { envelopeEventStatusCode: 'completed' },
                { envelopeEventStatusCode: 'declined' },
                { envelopeEventStatusCode: 'voided' }
            ],
            recipientEvents: [
                { recipientEventStatusCode: 'Sent' },
                { recipientEventStatusCode: 'Delivered' },
                { recipientEventStatusCode: 'Completed' },
                { recipientEventStatusCode: 'Declined' }
            ]
        };
    }

    const { envelopesApi, accountId } = await getDocusignApi();
    try {
        const results = await envelopesApi.createEnvelope(accountId, {
            envelopeDefinition,
        });

        return results;
    } catch (err) {
        thrower.axios(err, 'DocuSignCreateEnvelope');
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
