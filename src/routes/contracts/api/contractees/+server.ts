import { json, type RequestHandler } from '@sveltejs/kit';
import {
    findContractees,
    addContractee,
    setContractee,
    deleteContractee,
    findContracteesByRecruiterId
} from '$lib/server/db/firebase/recruiterContractee.fdb';
import bitrixService from '$lib/bitrix/bitrix.service';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const recruiterId = url.searchParams.get('recruiterId');
        let contractees = [];
        if (recruiterId) {
            contractees = await findContracteesByRecruiterId(recruiterId);
        } else {
            contractees = await findContractees();
        }
        return json({ success: true, contractees });
    } catch (err: any) {
        console.error('Failed to fetch contractees:', err);
        return json({ success: false, message: err.message || 'Failed to fetch contractees' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        let {
            id,
            name,
            phone,
            email,
            deliveryMethod,
            paymentMethod,
            bankAccount,
            recruiterId,
            recruiterName,
            newRecruiterName
        } = body;

        if (!name?.trim()) {
            return json({ success: false, message: 'Contractee name is required' }, { status: 400 });
        }

        // If recruiter is "create_new", create the option in the Bitrix userfield enumeration
        if (recruiterId === 'create_new') {
            const labelToAdd = (newRecruiterName || name).trim();
            try {
                const createdEnum = await bitrixService.addRecruiterEnumOption(labelToAdd);
                recruiterId = createdEnum.id;
                recruiterName = createdEnum.value;
            } catch (err: any) {
                console.error('Failed to create Bitrix recruiter enum option:', err);
                return json({
                    success: false,
                    message: `Failed to create new recruiter in Bitrix: ${err.message}`
                }, { status: 500 });
            }
        }

        const data = {
            name: name.trim(),
            phone: phone?.trim() || '',
            email: email?.trim() || '',
            deliveryMethod: deliveryMethod || 'email',
            paymentMethod: paymentMethod || 'bank',
            bankAccount: bankAccount?.trim() || '',
            recruiterId: recruiterId ? String(recruiterId) : '',
            recruiterName: recruiterName?.trim() || ''
        };

        if (id) {
            await setContractee(id, data);
            return json({ success: true, contractee: { id, ...data } });
        } else {
            const newId = await addContractee(data);
            return json({ success: true, contractee: { id: newId, ...data } });
        }
    } catch (err: any) {
        console.error('Failed to save contractee:', err);
        return json({ success: false, message: err.message || 'Failed to save contractee' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get('id');
    if (!id) {
        return json({ success: false, message: 'Contractee ID is required' }, { status: 400 });
    }

    try {
        await deleteContractee(id);
        return json({ success: true });
    } catch (err: any) {
        console.error('Failed to delete contractee:', err);
        return json({ success: false, message: err.message || 'Failed to delete contractee' }, { status: 500 });
    }
};
