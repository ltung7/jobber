import axios from 'axios';
import { BITRIX24_WEBHOOK_URL } from '$env/static/private';
import type {
    BitrixContact,
    BitrixDeal,
    BitrixLead,
    BitrixUser,
    BitrixField,
    BitrixFieldListItem,
    BitrixEntityType,
    ContactsFieldStatisticsResult,
    DealsFieldStatisticsResult,
    FieldStatistics,
    FieldValueStat,
    GetContactsWithFieldsOptions,
    GetDealsWithFieldsOptions,
    GetFieldsOptions,
    GetLeadsWithFieldsOptions,
    LeadsFieldStatisticsResult
} from './bitrix.d';
import saveJson from '$lib/utils/saveJson';

// Ensure the base URL has a trailing slash to prevent routing issues in Axios
const baseURL = BITRIX24_WEBHOOK_URL.endsWith('/') 
    ? BITRIX24_WEBHOOK_URL 
    : `${BITRIX24_WEBHOOK_URL}/`;

const client = axios.create({
    baseURL
});

/**
 * Checks if a field value is considered present/populated.
 */
export function isNonEmptyValue(val: any): boolean {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0 && val.some(isNonEmptyValue);
    if (typeof val === 'object') {
        if ('VALUE' in val) return isNonEmptyValue(val.VALUE);
        if ('value' in val) return isNonEmptyValue(val.value);
        if ('NAME' in val) return isNonEmptyValue(val.NAME);
        if ('name' in val) return isNonEmptyValue(val.name);
        return Object.keys(val).length > 0;
    }
    return true;
}

/**
 * Normalizes and extracts string representations of field values
 * (handles single string, numbers, arrays, enumeration objects, file objects).
 */
export function extractFieldValues(val: any): string[] {
    if (val === undefined || val === null) return [];
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? [trimmed] : [];
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
        return [String(val)];
    }
    if (Array.isArray(val)) {
        const results: string[] = [];
        for (const item of val) {
            results.push(...extractFieldValues(item));
        }
        return results;
    }
    if (typeof val === 'object') {
        if ('VALUE' in val && isNonEmptyValue(val.VALUE)) {
            return extractFieldValues(val.VALUE);
        }
        if ('value' in val && isNonEmptyValue(val.value)) {
            return extractFieldValues(val.value);
        }
        if ('NAME' in val && isNonEmptyValue(val.NAME)) {
            return extractFieldValues(val.NAME);
        }
        if ('name' in val && isNonEmptyValue(val.name)) {
            return extractFieldValues(val.name);
        }
        try {
            return [JSON.stringify(val)];
        } catch {
            return [];
        }
    }
    return [];
}

/**
 * Strips field definitions to a simple Record<string, string> mapping field key -> field name.
 */
export function stripFields(fields: Record<string, BitrixField>): Record<string, string> {
    const stripped: Record<string, string> = {};
    for (const [key, field] of Object.entries(fields)) {
        stripped[key] = field.listLabel || field.formLabel || field.title || field.filterLabel || key;
    }
    return stripped;
}

/**
 * Pure calculation function to generate value counts and statistics from leads or contacts data.
 */
export function calculateFieldStatistics<T extends Record<string, any> = BitrixLead>(
    items: T[],
    fieldKeys: string[],
    fieldDefinitions?: Record<string, BitrixField>
): LeadsFieldStatisticsResult & { items: T[] } {
    const totalLeadsAnalyzed = items.length;

    // Filter items that have at least one of the specified fields populated
    const matchingItems = items.filter((item) =>
        fieldKeys.some((key) => isNonEmptyValue(item[key]))
    );

    const fieldsStats: Record<string, FieldStatistics> = {};
    const combinedValueCounts: Record<string, number> = {};

    for (const key of fieldKeys) {
        const fieldDef = fieldDefinitions?.[key];
        const fieldTitle = fieldDef?.listLabel || fieldDef?.formLabel || fieldDef?.title || fieldDef?.filterLabel || key;

        let totalWithField = 0;
        const valueCounts: Record<string, number> = {};

        for (const item of items) {
            const rawVal = item[key];
            if (isNonEmptyValue(rawVal)) {
                totalWithField++;
                const values = extractFieldValues(rawVal);
                // Unique values per item for this field to avoid multi-counting within the same record
                const uniqueValuesForItem = new Set(values);
                for (const v of uniqueValuesForItem) {
                    valueCounts[v] = (valueCounts[v] || 0) + 1;
                }
            }
        }

        const totalEmpty = totalLeadsAnalyzed - totalWithField;

        const valueBreakdown: FieldValueStat[] = Object.entries(valueCounts)
            .map(([value, count]) => ({
                value,
                count,
                percentage: totalWithField > 0 ? Number(((count / totalWithField) * 100).toFixed(2)) : 0
            }))
            .sort((a, b) => b.count - a.count);

        fieldsStats[key] = {
            fieldKey: key,
            fieldTitle,
            totalWithField,
            totalEmpty,
            distinctValuesCount: Object.keys(valueCounts).length,
            valueCounts,
            valueBreakdown
        };
    }

    // Tally combined counts across all specified fields per item
    for (const item of matchingItems) {
        const combinedValuesForItem = new Set<string>();
        for (const key of fieldKeys) {
            const values = extractFieldValues(item[key]);
            for (const v of values) {
                combinedValuesForItem.add(v);
            }
        }
        for (const v of combinedValuesForItem) {
            combinedValueCounts[v] = (combinedValueCounts[v] || 0) + 1;
        }
    }

    const totalMatchingLeads = matchingItems.length;
    const combinedValueBreakdown: FieldValueStat[] = Object.entries(combinedValueCounts)
        .map(([value, count]) => ({
            value,
            count,
            percentage: totalMatchingLeads > 0 ? Number(((count / totalMatchingLeads) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => b.count - a.count);

    return {
        totalLeadsAnalyzed,
        totalMatchingLeads,
        fields: fieldsStats,
        combinedValueCounts,
        combinedValueBreakdown,
        leads: matchingItems as unknown as BitrixLead[],
        items: matchingItems
    };
}

/**
 * Helper to find items (leads, contacts, etc.) where a field matches a specific value/string.
 */
export function getItemsMatchingValue<T extends Record<string, any> = BitrixLead>(
    items: T[],
    fieldKey: string,
    expectedValue: string,
    options: { exactMatch?: boolean; caseSensitive?: boolean } = {}
): T[] {
    const { exactMatch = true, caseSensitive = false } = options;
    const target = caseSensitive ? expectedValue : expectedValue.toLowerCase();

    return items.filter((item) => {
        const values = extractFieldValues(item[fieldKey]);
        return values.some((val) => {
            const current = caseSensitive ? val : val.toLowerCase();
            return exactMatch ? current === target : current.includes(target);
        });
    });
}

export const getLeadsMatchingValue = getItemsMatchingValue;

/**
 * Utility to handle Bitrix24's 50-item pagination limit.
 * It will recursively fetch all items until the 'next' parameter is exhausted.
 */
async function fetchPaginated<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    let allResults: T[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await client.post(`${endpoint}.json`, {
            ...params,
            start
        });

        const data = response.data;

        if (data.result && Array.isArray(data.result)) {
            allResults = allResults.concat(data.result);
        }

        // Bitrix returns a 'next' property when there are more results
        if (data.next) {
            start = data.next;
        } else {
            hasMore = false;
        }
    }

    return allResults;
}

const bitrixService = {
    /**
     * Fetch all active users from Bitrix24 to map IDs to names.
     */
    async getUsers(): Promise<BitrixUser[]> {
        return fetchPaginated<BitrixUser>('user.get', {
            ACTIVE: true 
        });
    },

    /**
     * Fetch all fields defined for leads (including custom fields like UF_CRM_1787745014165).
     * If options.strip is true, returns Record<string, string> mapping field key -> field name.
     */
    async getLeadFields<T extends GetFieldsOptions = GetFieldsOptions>(
        options?: T
    ): Promise<T extends { strip: true } ? Record<string, string> : Record<string, BitrixField>> {
        const response = await client.post('crm.lead.fields.json');
        const fields: Record<string, BitrixField> = response.data?.result || {};
        const result = options?.strip ? stripFields(fields) : fields;
        if (options?.saveToFile) {
            await saveJson(result, options.filename || 'btx-lead-fields');
        }
        return result as any;
    },

    /**
     * Fetch all fields defined for contacts (including custom fields like UF_CRM_...).
     * If options.strip is true, returns Record<string, string> mapping field key -> field name.
     */
    async getContactFields<T extends GetFieldsOptions = GetFieldsOptions>(
        options?: T
    ): Promise<T extends { strip: true } ? Record<string, string> : Record<string, BitrixField>> {
        const response = await client.post('crm.contact.fields.json');
        const fields: Record<string, BitrixField> = response.data?.result || {};
        const result = options?.strip ? stripFields(fields) : fields;
        if (options?.saveToFile) {
            await saveJson(result, options.filename || 'btx-contact-fields');
        }
        return result as any;
    },

    /**
     * Fetch all fields defined for deals (including custom fields like UF_CRM_1787745014165).
     * If options.strip is true, returns Record<string, string> mapping field key -> field name.
     */
    async getDealFields<T extends GetFieldsOptions = GetFieldsOptions>(
        options?: T
    ): Promise<T extends { strip: true } ? Record<string, string> : Record<string, BitrixField>> {
        const response = await client.post('crm.deal.fields.json');
        const fields: Record<string, BitrixField> = response.data?.result || {};
        const result = options?.strip ? stripFields(fields) : fields;
        if (options?.saveToFile) {
            await saveJson(result, options.filename || 'btx-deal-fields');
        }
        return result as any;
    },

    /**
     * General method to get fields for leads, deals, contacts, or companies.
     * If options.strip is true, returns Record<string, string> mapping field key -> field name.
     */
    async getFields<T extends GetFieldsOptions = GetFieldsOptions>(
        entityType: BitrixEntityType = 'lead',
        options?: T
    ): Promise<T extends { strip: true } ? Record<string, string> : Record<string, BitrixField>> {
        const response = await client.post(`crm.${entityType}.fields.json`);
        const fields: Record<string, BitrixField> = response.data?.result || {};
        const result = options?.strip ? stripFields(fields) : fields;
        if (options?.saveToFile) {
            await saveJson(result, options.filename || `btx-${entityType}-fields`);
        }
        return result as any;
    },

    /**
     * Fetch lead fields as a structured list with label/title, type, and custom field flag.
     */
    async getLeadFieldsList(): Promise<BitrixFieldListItem[]> {
        const fields = await this.getLeadFields();
        return Object.entries(fields).map(([key, field]) => {
            const title = field.listLabel || field.formLabel || field.title || field.filterLabel || key;
            return {
                key,
                title,
                type: field.type || 'unknown',
                isMultiple: Boolean(field.isMultiple),
                isCustom: key.startsWith('UF_'),
                items: field.items,
                raw: field
            };
        });
    },

    /**
     * Fetch contact fields as a structured list with label/title, type, and custom field flag.
     */
    async getContactFieldsList(): Promise<BitrixFieldListItem[]> {
        const fields = await this.getContactFields();
        return Object.entries(fields).map(([key, field]) => {
            const title = field.listLabel || field.formLabel || field.title || field.filterLabel || key;
            return {
                key,
                title,
                type: field.type || 'unknown',
                isMultiple: Boolean(field.isMultiple),
                isCustom: key.startsWith('UF_'),
                items: field.items,
                raw: field
            };
        });
    },

    /**
     * Fetch all leads modified/closed within a specific date range.
     * We filter by STATUS_ID = 'CONVERTED' assuming this is your standard closed status.
     */
    async getClosedLeads(startDate: string, endDate: string): Promise<BitrixLead[]> {
        return fetchPaginated<BitrixLead>('crm.lead.list', {
            filter: {
                '>=DATE_MODIFY': startDate,
                '<=DATE_MODIFY': endDate,
                'STATUS_ID': 'CONVERTED'
            },
            select: [
                'ID',
                'TITLE',
                'STATUS_ID',
                'ASSIGNED_BY_ID',
                'OPPORTUNITY',
                'CURRENCY_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'DATE_CLOSED'
            ]
        });
    },

    /**
     * Fetch all deals within a specific date range (based on the selected dateField).
     */
    async getClosedDeals(startDate: string, endDate: string, dateField: string = 'CLOSEDATE'): Promise<BitrixDeal[]> {
        return fetchPaginated<BitrixDeal>('crm.deal.list', {
            filter: {
                [`>=${dateField}`]: startDate,
                [`<=${dateField}`]: endDate
            },
            select: [
                'ID',
                'TITLE',
                'STAGE_ID',
                'ASSIGNED_BY_ID',
                'OPPORTUNITY',
                'CURRENCY_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'BEGINDATE',
                'CLOSEDATE',
                'UF_CRM_1787745014165',
                'UF_CRM_1787745029864',
                'UF_CRM_1787746162988',
                'UF_CRM_1787746186953'
            ]
        });
    },

    /**
     * Fetch leads including specific fields (e.g. ['UF_CRM_1787745014165']).
     * By default filters to leads where at least one of the passed fields has a value.
     */
    async getLeadsWithFields(
        fieldKeys: string[],
        options: GetLeadsWithFieldsOptions = {}
    ): Promise<BitrixLead[]> {
        const {
            filter = {},
            requireValues = true,
            startDate,
            endDate,
            statusId,
            additionalSelect = []
        } = options;

        const activeFilter: Record<string, any> = { ...filter };
        if (startDate) activeFilter['>=DATE_MODIFY'] = startDate;
        if (endDate) activeFilter['<=DATE_MODIFY'] = endDate;
        if (statusId) activeFilter['STATUS_ID'] = statusId;

        const baseSelect = [
            'ID',
            'TITLE',
            'STATUS_ID',
            'ASSIGNED_BY_ID',
            'OPPORTUNITY',
            'CURRENCY_ID',
            'DATE_CREATE',
            'DATE_MODIFY',
            'DATE_CLOSED'
        ];

        const select = Array.from(new Set([...baseSelect, ...fieldKeys, ...additionalSelect]));

        const leads = await fetchPaginated<BitrixLead>('crm.lead.list', {
            filter: activeFilter,
            select
        });

        if (!requireValues || fieldKeys.length === 0) {
            return leads;
        }

        return leads.filter((lead) =>
            fieldKeys.some((key) => isNonEmptyValue(lead[key]))
        );
    },

    /**
     * Helper to transform a full Bitrix fields map to simple { [key]: name } pairs.
     */
    stripFields,

    /**
     * Calculate value statistics on already fetched leads.
     */
    calculateFieldStatistics,

    /**
     * Helper to find leads where a field matches a specific value.
     */
    getLeadsMatchingValue,

    /**
     * Fetches leads with the specified field keys and computes statistics for each field's values
     * (e.g. how many leads have written "car part", value breakdown, percentages).
     */
    async getLeadsFieldStatistics(
        fieldKeys: string[],
        options: GetLeadsWithFieldsOptions = {}
    ): Promise<LeadsFieldStatisticsResult> {
        // Fetch all matching filter bounds without dropping empty values yet
        // so totalLeadsAnalyzed is accurate
        const leads = await this.getLeadsWithFields(fieldKeys, {
            ...options,
            requireValues: false
        });

        let fieldDefinitions: Record<string, BitrixField> | undefined;
        try {
            fieldDefinitions = await this.getLeadFields();
        } catch {
            // Silently fall back to field keys if metadata fetch fails
        }

        return calculateFieldStatistics(leads, fieldKeys, fieldDefinitions);
    },

    /**
     * Fetch contacts including specific fields (e.g. ['UF_CRM_...'] or standard fields).
     * By default filters to contacts where at least one of the passed fields has a value.
     */
    async getContactsWithFields(
        fieldKeys: string[],
        options: GetContactsWithFieldsOptions = {}
    ): Promise<BitrixContact[]> {
        const {
            filter = {},
            requireValues = true,
            startDate,
            endDate,
            additionalSelect = []
        } = options;

        const activeFilter: Record<string, any> = { ...filter };
        if (startDate) activeFilter['>=DATE_MODIFY'] = startDate;
        if (endDate) activeFilter['<=DATE_MODIFY'] = endDate;

        const baseSelect = [
            'ID',
            'NAME',
            'LAST_NAME',
            'SECOND_NAME',
            'ASSIGNED_BY_ID',
            'DATE_CREATE',
            'DATE_MODIFY'
        ];

        const select = Array.from(new Set([...baseSelect, ...fieldKeys, ...additionalSelect]));

        const contacts = await fetchPaginated<BitrixContact>('crm.contact.list', {
            filter: activeFilter,
            select
        });

        if (!requireValues || fieldKeys.length === 0) {
            return contacts;
        }

        return contacts.filter((contact) =>
            fieldKeys.some((key) => isNonEmptyValue(contact[key]))
        );
    },

    /**
     * Fetches contacts with the specified field keys and computes statistics for each field's values
     * (e.g. how many contacts have a specific custom value, distribution, percentages).
     */
    async getContactsFieldStatistics(
        fieldKeys: string[],
        options: GetContactsWithFieldsOptions = {}
    ): Promise<ContactsFieldStatisticsResult> {
        const contacts = await this.getContactsWithFields(fieldKeys, {
            ...options,
            requireValues: false
        });

        let fieldDefinitions: Record<string, BitrixField> | undefined;
        try {
            fieldDefinitions = await this.getContactFields();
        } catch {
            // Silently fall back to field keys if metadata fetch fails
        }

        const stats = calculateFieldStatistics(contacts, fieldKeys, fieldDefinitions);
        return {
            totalAnalyzed: stats.totalLeadsAnalyzed,
            totalMatching: stats.totalMatchingLeads,
            fields: stats.fields,
            combinedValueCounts: stats.combinedValueCounts,
            combinedValueBreakdown: stats.combinedValueBreakdown,
            items: stats.items as BitrixContact[]
        };
    },

    /**
     * Fetch deals including specific fields (e.g. ['UF_CRM_1787745014165'] or standard fields).
     * By default filters to deals where at least one of the passed fields has a value.
     */
    async getDealsWithFields(
        fieldKeys: string[],
        options: GetDealsWithFieldsOptions = {}
    ): Promise<BitrixDeal[]> {
        const {
            filter = {},
            requireValues = true,
            startDate,
            endDate,
            stageId,
            dateField = 'CLOSEDATE',
            additionalSelect = []
        } = options;

        const activeFilter: Record<string, any> = { ...filter };
        if (startDate) activeFilter[`>=${dateField}`] = startDate;
        if (endDate) activeFilter[`<=${dateField}`] = endDate;
        if (stageId) activeFilter['STAGE_ID'] = stageId;

        const baseSelect = [
            'ID',
            'TITLE',
            'STAGE_ID',
            'ASSIGNED_BY_ID',
            'OPPORTUNITY',
            'CURRENCY_ID',
            'DATE_CREATE',
            'DATE_MODIFY',
            'BEGINDATE',
            'CLOSEDATE'
        ];

        const select = Array.from(new Set([...baseSelect, ...fieldKeys, ...additionalSelect]));

        const deals = await fetchPaginated<BitrixDeal>('crm.deal.list', {
            filter: activeFilter,
            select
        });

        if (!requireValues || fieldKeys.length === 0) {
            return deals;
        }

        return deals.filter((deal) =>
            fieldKeys.some((key) => isNonEmptyValue(deal[key]))
        );
    },

    /**
     * Fetches deals with the specified field keys and computes statistics for each field's values
     * (e.g. distribution, value counts, percentages).
     */
    async getDealsFieldStatistics(
        fieldKeys: string[],
        options: GetDealsWithFieldsOptions = {}
    ): Promise<DealsFieldStatisticsResult> {
        const deals = await this.getDealsWithFields(fieldKeys, {
            ...options,
            requireValues: false
        });

        let fieldDefinitions: Record<string, BitrixField> | undefined;
        try {
            fieldDefinitions = await this.getDealFields();
        } catch {
            // Silently fall back to field keys if metadata fetch fails
        }

        const stats = calculateFieldStatistics(deals, fieldKeys, fieldDefinitions);
        return {
            totalAnalyzed: stats.totalLeadsAnalyzed,
            totalMatching: stats.totalMatchingLeads,
            fields: stats.fields,
            combinedValueCounts: stats.combinedValueCounts,
            combinedValueBreakdown: stats.combinedValueBreakdown,
            items: stats.items as BitrixDeal[]
        };
    },

    /**
     * Fetch contacts by an array of IDs.
     * Note: Bitrix has limits on how many items can be passed in a filter at once.
     * `fetchPaginated` handles pagination, but if contactIds is massive, it might be better
     * to split it into chunks. Assuming reasonable amounts for a month.
     */
    async getContactsByIds(contactIds: (string | number)[]): Promise<BitrixContact[]> {
        if (!contactIds || contactIds.length === 0) return [];
        return fetchPaginated<BitrixContact>('crm.contact.list', {
            filter: {
                '@ID': contactIds
            },
            select: [
                'ID',
                'NAME',
                'LAST_NAME',
                'SECOND_NAME',
                'UF_CRM_1790672831151' // Recruiter field
            ]
        });
    },

    /**
     * Get deals for recruiter analytics. 
     * Uses `UF_CRM_1787746162988` (Work Start) for filtering and ensures CONTACT_ID is selected.
     */
    async getRecruiterDeals(startDate: string, endDate: string): Promise<BitrixDeal[]> {
        return fetchPaginated<BitrixDeal>('crm.deal.list', {
            filter: {
                '>=UF_CRM_1787746162988': startDate,
                '<=UF_CRM_1787746162988': endDate
            },
            select: [
                'ID',
                'TITLE',
                'CONTACT_ID',
                'UF_CRM_1787746162988', // Work Start
                'UF_CRM_1787746186953', // Work End
                'UF_CRM_1787822368903', // Project
                'ASSIGNED_BY_ID' // For fallback/display
            ]
        });
    },

    /**
     * Get ALL deals for a list of contacts within a wider timeframe (for evaluation).
     */
    async getDealsForContacts(contactIds: (string | number)[], startDate: string | null, endDate: string): Promise<BitrixDeal[]> {
        if (!contactIds || contactIds.length === 0) return [];
        
        const filter: any = {
            '@CONTACT_ID': contactIds,
            '<=UF_CRM_1787746162988': endDate
        };
        
        if (startDate) {
            filter['>=UF_CRM_1787746162988'] = startDate;
        }
        
        return fetchPaginated<BitrixDeal>('crm.deal.list', {
            filter,
            select: [
                'ID',
                'TITLE',
                'CONTACT_ID',
                'UF_CRM_1787746162988', // Work Start
                'UF_CRM_1787746186953', // Work End
                'UF_CRM_1787822368903'  // Project
            ]
        });
    }
};

export default bitrixService;