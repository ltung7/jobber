import { json, type RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import dayjs from 'dayjs';

function isValidNip(nip: string): boolean {
    if (!/^\d{10}$/.test(nip)) return false;
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(nip[i], 10) * weights[i];
    }
    const controlDigit = sum % 11;
    if (controlDigit === 10) return false;
    return controlDigit === parseInt(nip[9], 10);
}

export const GET: RequestHandler = async ({ url }) => {
    const rawNip = url.searchParams.get('nip') || '';
    const cleanNip = rawNip.replace(/\D/g, '');

    if (!cleanNip) {
        return json({ success: false, message: 'NIP is required' }, { status: 400 });
    }

    if (!isValidNip(cleanNip)) {
        return json({ success: false, message: 'Invalid Polish NIP format or checksum' }, { status: 400 });
    }

    const today = dayjs().format('YYYY-MM-DD');
    const apiUrl = `https://wl-api.mf.gov.pl/api/search/nip/${cleanNip}?date=${today}`;

    try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const subject = response.data?.result?.subject;

        if (!subject) {
            return json({
                success: false,
                message: 'Company not found in Ministry of Finance registry for given NIP'
            }, { status: 404 });
        }

        const representatives = Array.isArray(subject.representatives)
            ? subject.representatives
                .map((r: any) => `${r.name || ''} ${r.lastName || ''}`.trim())
                .filter(Boolean)
                .join(', ')
            : '';

        const address = subject.workingAddress || subject.residenceAddress || '';

        const company = {
            name: subject.name || '',
            nip: subject.nip || cleanNip,
            regon: subject.regon || '',
            krs: subject.krs || '',
            address,
            representative: representatives || '',
            bankAccounts: Array.isArray(subject.accountNumbers) ? subject.accountNumbers : [],
            statusVat: subject.statusVat || ''
        };

        return json({
            success: true,
            company
        });
    } catch (err: any) {
        console.error('Error fetching company by NIP from wl-api.mf.gov.pl:', err?.message || err);
        const status = err.response?.status || 500;
        const msg = err.response?.data?.message || err.message || 'Failed to download company data from Ministry of Finance';
        return json({ success: false, message: msg }, { status });
    }
};
