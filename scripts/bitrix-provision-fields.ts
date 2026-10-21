import fs from 'fs';
import path from 'path';
import axios from 'axios';

const envPath = path.resolve(process.cwd(), '.env');
console.log('Reading .env from:', envPath);
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
            if (!process.env[key]) {
                process.env[key] = val;
            }
        }
    }
}

const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;
console.log('Resolved BITRIX24_WEBHOOK_URL:', webhookUrl ? webhookUrl.substring(0, 30) + '...' : 'UNDEFINED');
if (!webhookUrl) {
    console.error('ERROR: BITRIX24_WEBHOOK_URL is not set in environment variables.');
    process.exit(1);
}

const callBitrix = async (method: string, params: Record<string, any> = {}) => {
    const url = `${webhookUrl.replace(/\/$/, '')}/${method}`;
    const res = await axios.post(url, params);
    return res.data;
};

const fieldsToProvision = [
    {
        FIELD_NAME: 'UF_CRM_CONTACT_TRC_VALIDITY',
        USER_TYPE_ID: 'date',
        XML_ID: 'UF_CRM_CONTACT_TRC_VALIDITY',
        EDIT_FORM_LABEL: { en: 'TRC validity date', pl: 'Data ważności karty pobytu' },
        LIST_COLUMN_LABEL: { en: 'TRC validity', pl: 'Ważność karty pobytu' },
        VIEW_FORM_LABEL: { en: 'TRC validity date', pl: 'Data ważności karty pobytu' },
    },
    {
        FIELD_NAME: 'UF_CRM_CONTACT_VISA_VALIDITY',
        USER_TYPE_ID: 'date',
        XML_ID: 'UF_CRM_CONTACT_VISA_VALIDITY',
        EDIT_FORM_LABEL: { en: 'Visa validity date', pl: 'Data ważności wizy' },
        LIST_COLUMN_LABEL: { en: 'Visa validity', pl: 'Ważność wizy' },
        VIEW_FORM_LABEL: { en: 'Visa validity date', pl: 'Data ważności wizy' },
    },
    {
        FIELD_NAME: 'UF_CRM_CONTACT_WP_VALIDITY',
        USER_TYPE_ID: 'date',
        XML_ID: 'UF_CRM_CONTACT_WP_VALIDITY',
        EDIT_FORM_LABEL: { en: 'WP validity date', pl: 'Data ważności zezwolenia na pracę' },
        LIST_COLUMN_LABEL: { en: 'WP validity', pl: 'Ważność zezwolenia na pracę' },
        VIEW_FORM_LABEL: { en: 'WP validity date', pl: 'Data ważności zezwolenia na pracę' },
    },
    {
        FIELD_NAME: 'UF_CRM_CONTACT_PASSPORT_VALIDITY',
        USER_TYPE_ID: 'date',
        XML_ID: 'UF_CRM_CONTACT_PASSPORT_VALIDITY',
        EDIT_FORM_LABEL: { en: 'Passport validity date', pl: 'Data ważności paszportu' },
        LIST_COLUMN_LABEL: { en: 'Passport validity', pl: 'Ważność paszportu' },
        VIEW_FORM_LABEL: { en: 'Passport validity date', pl: 'Data ważności paszportu' },
    },
    {
        FIELD_NAME: 'UF_CRM_CONTACT_REFERRER',
        USER_TYPE_ID: 'string',
        XML_ID: 'UF_CRM_CONTACT_REFERRER',
        EDIT_FORM_LABEL: { en: 'Referrer (Everest Hiring Program)', pl: 'Polecający (Everest Hiring Program)' },
        LIST_COLUMN_LABEL: { en: 'Referrer', pl: 'Polecający' },
        VIEW_FORM_LABEL: { en: 'Referrer (Everest Hiring Program)', pl: 'Polecający (Everest Hiring Program)' },
    }
];

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const isApply = process.argv.includes('--apply');

    console.log('=== Bitrix24 Contact Custom Fields Provisioning Tool ===');
    
    // 1. Fetch existing fields
    console.log('Fetching existing contact user fields via crm.contact.userfield.list...');
    const existingRes = await callBitrix('crm.contact.userfield.list', {});
    const existingFields = existingRes.result || [];
    const existingFieldNames = new Set(existingFields.map((f: any) => f.FIELD_NAME));

    console.log(`Found ${existingFields.length} existing user fields on CRM_CONTACT.`);

    for (const f of fieldsToProvision) {
        const exists = existingFieldNames.has(f.FIELD_NAME);
        if (exists) {
            console.log(`[EXISTS] ${f.FIELD_NAME} (${f.EDIT_FORM_LABEL?.pl}) already exists on CRM_CONTACT.`);
        } else {
            console.log(`[MISSING] ${f.FIELD_NAME} (${f.EDIT_FORM_LABEL?.pl}) is MISSING on CRM_CONTACT.`);
            if (isApply) {
                console.log(`Creating ${f.FIELD_NAME} via crm.contact.userfield.add...`);
                try {
                    const addRes = await callBitrix('crm.contact.userfield.add', {
                        fields: {
                            FIELD_NAME: f.FIELD_NAME,
                            USER_TYPE_ID: f.USER_TYPE_ID,
                            XML_ID: f.XML_ID,
                            EDIT_FORM_LABEL: f.EDIT_FORM_LABEL,
                            LIST_COLUMN_LABEL: f.LIST_COLUMN_LABEL,
                            VIEW_FORM_LABEL: f.VIEW_FORM_LABEL
                        }
                    });
                    console.log(`Successfully created ${f.FIELD_NAME}:`, addRes);
                } catch (err: any) {
                    console.error(`Failed to create ${f.FIELD_NAME}:`, err?.response?.data || err.message);
                }
            }
        }
    }

    if (!isApply && !isDryRun) {
        console.log('\nRun with --dry-run to check status or --apply to create missing fields.');
    }
}

main().catch(console.error);
