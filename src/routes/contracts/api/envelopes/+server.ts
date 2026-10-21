import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import {
    addEnvelope,
    findEnvelopes,
    findEnvelopesByRecruiterId,
    findEnvelopesByContracteeId,
    type SentEnvelope
} from '$lib/server/db/firebase/recruiterEnvelope.fdb';
import {
    addContractee,
    getContractee,
    setContractee,
    findContractees
} from '$lib/server/db/firebase/recruiterContractee.fdb';
import { sendEnvelope } from '$lib/server/services/docusign/docusign.service';
import bitrixService from '$lib/bitrix/bitrix.service';
import { thrower } from '$lib/utils/logger';

export const GET = async ({ url }: RequestEvent) => {
    try {
        const recruiterId = url.searchParams.get('recruiterId');
        const contracteeId = url.searchParams.get('contracteeId');

        let envelopes: SentEnvelope[] = [];
        if (recruiterId) {
            envelopes = await findEnvelopesByRecruiterId(recruiterId);
        } else if (contracteeId) {
            envelopes = await findEnvelopesByContracteeId(contracteeId);
        } else {
            envelopes = await findEnvelopes();
        }

        envelopes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return json({ envelopes });
    } catch (err: any) {
        throw error(500, err?.message || 'Failed to fetch envelopes');
    }
};

export const POST = async ({ request }: RequestEvent) => {
    const payload = await request.json();
    let {
        pdfBase64,
        contractId,
        contractTitle,
        contractorId,
        contractorNip,
        contracteeId,
        language = 'pl',
        plainText = '',
        receiver,
        sender = { name: 'EISG Sp. z o.o.', email: 'biuro@eisg.pl' },
        paymentMethod = 'bank',
        bankAccount = '',
        recruiterId = 'none',
        recruiterName = '',
        newRecruiterName = '',
        totalPages = 1,
        leftCoords,
        rightCoords
    } = payload;

    if (!pdfBase64) {
        throw error(400, 'PDF document is required');
    }
    if (!receiver || !receiver.name) {
        throw error(400, 'Receiver name is required');
    }
    if (!receiver.email && !receiver.phone) {
        throw error(400, 'Receiver email or phone number is required');
    }

    // Recruiter enum item handling in Bitrix
    if (recruiterId === 'create_new') {
        const labelToAdd = (newRecruiterName || receiver.name).trim();
        try {
            const createdEnum = await bitrixService.addRecruiterEnumOption(labelToAdd);
            recruiterId = createdEnum.id;
            recruiterName = createdEnum.value;
        } catch (enumErr: any) {
            console.error('Failed to create recruiter enum option in Bitrix:', enumErr);
        }
    }

    // Persist or link Contractee in FDB
    let resolvedContracteeId = contracteeId;
    try {
        if (resolvedContracteeId) {
            // Update existing contractee with latest contact/payment info
            await setContractee(resolvedContracteeId, {
                phone: receiver.phone || '',
                email: receiver.email || '',
                deliveryMethod: receiver.deliveryMethod || 'email',
                paymentMethod,
                bankAccount: paymentMethod === 'bank' ? bankAccount : '',
                recruiterId: recruiterId && recruiterId !== 'none' ? String(recruiterId) : '',
                recruiterName: recruiterName || ''
            });
        } else {
            // Check if contractee already exists by name/phone/email
            const existingContractees = await findContractees();
            const match = existingContractees.find((c: any) => {
                if (c.name.trim().toLowerCase() !== receiver.name.trim().toLowerCase()) return false;
                if (receiver.phone && c.phone && c.phone.trim() === receiver.phone.trim()) return true;
                if (receiver.email && c.email && c.email.trim().toLowerCase() === receiver.email.trim().toLowerCase()) return true;
                return true;
            });

            if (match && match.id) {
                resolvedContracteeId = match.id;
                await setContractee(match.id, {
                    phone: receiver.phone || match.phone,
                    email: receiver.email || match.email,
                    paymentMethod,
                    bankAccount: paymentMethod === 'bank' ? bankAccount : match.bankAccount,
                    recruiterId: recruiterId && recruiterId !== 'none' ? String(recruiterId) : match.recruiterId,
                    recruiterName: recruiterName || match.recruiterName
                });
            } else {
                const newCId = await addContractee({
                    name: receiver.name.trim(),
                    phone: receiver.phone?.trim() || '',
                    email: receiver.email?.trim() || '',
                    deliveryMethod: receiver.deliveryMethod || 'email',
                    paymentMethod,
                    bankAccount: paymentMethod === 'bank' ? bankAccount.trim() : '',
                    recruiterId: recruiterId && recruiterId !== 'none' ? String(recruiterId) : '',
                    recruiterName: recruiterName?.trim() || ''
                });
                resolvedContracteeId = typeof newCId === 'string' ? newCId : undefined;
            }
        }
    } catch (contracteeErr) {
        console.error('Error linking/saving contractee:', contracteeErr);
    }

    // Prepare PDF buffer
    const base64Clean = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const buffer = Buffer.from(base64Clean, 'base64');

    // Send envelope via DocuSign
    let envelopeResult;
    try {
        const isSms = receiver.deliveryMethod === 'SMS' || (!receiver.email && Boolean(receiver.phone));
        envelopeResult = await sendEnvelope({
            buffer,
            name: `${contractTitle || 'Agreement'} - ${receiver.name}`,
            useAnchor: false,
            page: totalPages || 1,
            leftCoords,
            rightCoords,
            replyTo: sender?.email ? {
                name: sender.name || 'EISG Sp. z o.o.',
                email: sender.email
            } : undefined,
            leftSigner: sender?.name ? {
                name: sender.name,
                email: sender.email || 'biuro@eisg.pl',
                deliveryMethod: 'email'
            } : undefined,
            rightSigner: {
                name: receiver.name,
                email: receiver.email,
                phone: receiver.phone,
                deliveryMethod: isSms ? 'SMS' : 'email'
            },
            metadata: {
                contractId: contractId || '',
                recruiterId: String(recruiterId || ''),
                contracteeId: String(resolvedContracteeId || ''),
                contractorId: String(contractorId || ''),
                paymentMethod: paymentMethod || ''
            }
        });
    } catch (dsErr: any) {
        thrower.endpoint(dsErr, 500, true);
    }

    if (!envelopeResult?.envelopeId) {
        throw error(500, 'DocuSign did not return an envelope ID');
    }

    // Save sent envelope to envelope.fdb.ts
    const envelopeData:  Omit<SentEnvelope, 'id'> = {
        envelopeId: envelopeResult.envelopeId,
        contractTitle: contractTitle || 'Recommendation Agreement',
        language,
        sender,
        receiver: {
            ...receiver,
            deliveryMethod: receiver.deliveryMethod || (!receiver.email ? 'SMS' : 'email')
        },
        paymentMethod,
        status: envelopeResult.status || 'sent',
        plainText,
        createdAt: new Date().toISOString()
    };

    if (contractId) envelopeData.contractId = contractId;
    if (contractorId) envelopeData.contractorId = contractorId;
    if (contractorNip) envelopeData.contractorNip = contractorNip;
    if (resolvedContracteeId) envelopeData.contracteeId = resolvedContracteeId;
    if (paymentMethod === 'bank' && bankAccount) envelopeData.bankAccount = bankAccount;
    if (recruiterId && recruiterId !== 'none') envelopeData.recruiterId = String(recruiterId);
    if (recruiterName) envelopeData.recruiterName = recruiterName;

    const docId = await addEnvelope(envelopeData);

    return json({
        success: true,
        id: docId,
        envelopeId: envelopeResult.envelopeId,
        recruiterId,
        recruiterName,
        contracteeId: resolvedContracteeId
    });
};
