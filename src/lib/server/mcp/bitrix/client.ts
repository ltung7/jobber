import axios from 'axios';
import { ALLOWED_BITRIX_METHODS, ALLOWED_CRM_ENTITY_TYPES, getBitrixWebhookUrl } from './config';
import { sanitizeBitrixPayload, sanitizeSelectFields } from './sanitizer';

export class BitrixReadOnlyViolationError extends Error {
    constructor(method: string, reason: string) {
        super(`Bitrix Read-Only Enforcement Violation [${method}]: ${reason}`);
        this.name = 'BitrixReadOnlyViolationError';
    }
}

export class BitrixEntityTypeViolationError extends Error {
    constructor(entityTypeId: number) {
        super(`Bitrix Entity Type Violation [${entityTypeId}]: Only Leads (1), Deals (2), and Contacts (3) are allowed.`);
        this.name = 'BitrixEntityTypeViolationError';
    }
}

export const callBitrixReadOnly = async <T = any>(method: string, params: Record<string, any> = {}): Promise<T> => {
    // 1. Enforce strict whitelist
    if (!ALLOWED_BITRIX_METHODS.has(method as any)) {
        throw new BitrixReadOnlyViolationError(method, 'Method is not in the strict read-only whitelist.');
    }

    // 2. Enforce entityTypeId restrictions for CRM methods
    if (method.startsWith('crm.item.')) {
        const entityTypeId = Number(params.entityTypeId);
        if (!isNaN(entityTypeId) && !ALLOWED_CRM_ENTITY_TYPES.has(entityTypeId)) {
            throw new BitrixEntityTypeViolationError(entityTypeId);
        }
    }

    // 3. For activities or items, sanitize select fields
    if (params.select && Array.isArray(params.select)) {
        params.select = sanitizeSelectFields(params.select);
    }
    if (params.filter && params.filter.select && Array.isArray(params.filter.select)) {
        params.filter.select = sanitizeSelectFields(params.filter.select);
    }

    const webhookUrl = getBitrixWebhookUrl();
    const endpoint = `${webhookUrl.replace(/\/$/, '')}/${method}`;

    try {
        const response = await axios.post(endpoint, params, { timeout: 30000 });
        const data = response.data;

        if (data && data.error) {
            throw new Error(`Bitrix REST Error [${data.error}]: ${data.error_description || 'Unknown error'}`);
        }

        // Sanitize response to ensure GDPR/RODO compliance
        return sanitizeBitrixPayload(data);
    } catch (err: any) {
        if (err instanceof BitrixReadOnlyViolationError || err instanceof BitrixEntityTypeViolationError) {
            throw err;
        }
        throw new Error(`Bitrix API call failed for ${method}: ${err.message || err}`);
    }
};

export const fetchBitrixPaginatedReadOnly = async <T = any>(
    method: string,
    params: Record<string, any> = {},
    maxRecords: number = 2500
): Promise<T[]> => {
    let allItems: T[] = [];
    let start = 0;
    const limit = 50; // Bitrix max batch per request is 50 for items

    while (allItems.length < maxRecords) {
        const batchParams = { ...params, start };
        const res = await callBitrixReadOnly(method, batchParams);
        
        let batchItems: T[] = [];
        if (res && res.result) {
            if (Array.isArray(res.result)) {
                batchItems = res.result;
            } else if (res.result.items && Array.isArray(res.result.items)) {
                batchItems = res.result.items;
            } else if (typeof res.result === 'object') {
                // Some methods return object map or single result
                batchItems = [res.result];
            }
        }

        if (batchItems.length === 0) {
            break;
        }

        allItems = allItems.concat(batchItems);

        // Check pagination next offset
        if (res && typeof res.next === 'number') {
            start = res.next;
        } else if (batchItems.length < limit) {
            break;
        } else {
            start += batchItems.length;
        }

        if (allItems.length >= maxRecords) {
            break;
        }
    }

    return allItems;
};
