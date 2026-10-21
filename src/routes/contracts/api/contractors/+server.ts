import { json, type RequestHandler } from '@sveltejs/kit';
import {
    findContractors,
    addContractor,
    setContractor,
    deleteContractor,
    ensureDefaultContractor
} from '$lib/server/db/firebase/recruiterContractor.fdb';

export const GET: RequestHandler = async () => {
    try {
        let contractors = await findContractors();
        if (contractors.length === 0) {
            await ensureDefaultContractor();
            contractors = await findContractors();
        }
        return json({ success: true, contractors });
    } catch (err: any) {
        console.error('Failed to fetch contractors:', err);
        return json({ success: false, message: err.message || 'Failed to fetch contractors' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, name, nip, regon, krs, address, representative, email, phone, isDefault } = body;

        if (!name || !nip || !address) {
            return json({ success: false, message: 'Name, NIP, and Address are required' }, { status: 400 });
        }

        // If setting as default, unset other contractors' default status
        if (isDefault) {
            const all = await findContractors();
            for (const c of all) {
                if (c.id && c.id !== id && c.isDefault) {
                    await setContractor(c.id, { isDefault: false });
                }
            }
        }

        const data = {
            name: name.trim(),
            nip: nip.trim(),
            regon: regon?.trim() || '',
            krs: krs?.trim() || '',
            address: address.trim(),
            representative: representative?.trim() || '',
            email: email?.trim() || '',
            phone: phone?.trim() || '',
            isDefault: Boolean(isDefault)
        };

        if (id) {
            await setContractor(id, data);
            return json({ success: true, contractor: { id, ...data } });
        } else {
            const newId = await addContractor(data);
            return json({ success: true, contractor: { id: newId, ...data } });
        }
    } catch (err: any) {
        console.error('Failed to save contractor:', err);
        return json({ success: false, message: err.message || 'Failed to save contractor' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get('id');
    if (!id) {
        return json({ success: false, message: 'Contractor ID is required' }, { status: 400 });
    }

    try {
        await deleteContractor(id);
        return json({ success: true });
    } catch (err: any) {
        console.error('Failed to delete contractor:', err);
        return json({ success: false, message: err.message || 'Failed to delete contractor' }, { status: 500 });
    }
};
