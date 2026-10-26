import { callBitrixReadOnly, fetchBitrixPaginatedReadOnly } from './client';

const CRM_ENTITY_ID_DESCRIPTION = 'Entity type ID: 1 (Lead), 2 (Deal), 3 (Contact), 7 (Quote/Oferta)';

const entityTypeIdSchema = (server: any) =>
    server.z.union([server.z.literal(1), server.z.literal(2), server.z.literal(3), server.z.literal(7)]);

export const registerLowLevelTools = (server: any) => {
    // 1. crm_item_list
    server.tool(
        'crm_item_list',
        'List CRM items (Leads=1, Deals=2, Contacts=3) with optional filter, order, and select fields.',
        {
            entityTypeId: entityTypeIdSchema(server).describe(CRM_ENTITY_ID_DESCRIPTION),
            filter: server.z.record(server.z.any()).optional().describe('Filter criteria object'),
            order: server.z.record(server.z.any()).optional().describe('Sorting order object'),
            select: server.z.array(server.z.string()).optional().describe('Fields to select (e.g. ["*", "UF_*"])'),
            start: server.z.number().optional().describe('Pagination start offset'),
            fetchAll: server.z.boolean().optional().default(false).describe('Whether to fetch all pages automatically (up to 2500 records)')
        },
        async ({ entityTypeId, filter, order, select, start, fetchAll }: any) => {
            // NOTE: never send useOriginalUfNames to crm.item.list — Bitrix returns every item as an
            // empty array ([]) instead of an object when that legacy flag is present. Verified live 2026-10-22.
            const params: Record<string, any> = { entityTypeId };
            if (filter) params.filter = filter;
            if (order) params.order = order;
            if (select) params.select = select;
            if (start !== undefined) params.start = start;

            if (fetchAll) {
                const items = await fetchBitrixPaginatedReadOnly('crm.item.list', params);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ items, total: items.length }, null, 2) }]
                };
            }

            const result = await callBitrixReadOnly('crm.item.list', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 2. crm_item_get
    server.tool(
        'crm_item_get',
        'Get a single CRM item (Lead=1, Deal=2, Contact=3) by its ID.',
        {
            entityTypeId: entityTypeIdSchema(server).describe(CRM_ENTITY_ID_DESCRIPTION),
            id: server.z.number().describe('Item record ID'),
            useOriginalUfNames: server.z.string().optional().default('Y').describe('Use original user field names')
        },
        async ({ entityTypeId, id, useOriginalUfNames }: any) => {
            const result = await callBitrixReadOnly('crm.item.get', { entityTypeId, id, useOriginalUfNames });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 3. crm_item_fields
    server.tool(
        'crm_item_fields',
        'Get field definitions and schema for CRM items (Leads=1, Deals=2, Contacts=3).',
        {
            entityTypeId: entityTypeIdSchema(server).describe(CRM_ENTITY_ID_DESCRIPTION),
            useOriginalUfNames: server.z.string().optional().default('Y').describe('Use original user field names')
        },
        async ({ entityTypeId, useOriginalUfNames }: any) => {
            const result = await callBitrixReadOnly('crm.item.fields', { entityTypeId, useOriginalUfNames });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 4. crm_category_list
    server.tool(
        'crm_category_list',
        'List CRM categories (pipelines/funnels) for deals (entityTypeId=2 by default).',
        {
            entityTypeId: entityTypeIdSchema(server).optional().default(2).describe('Entity type ID (default 2 for Deals)')
        },
        async ({ entityTypeId }: any) => {
            const result = await callBitrixReadOnly('crm.category.list', { entityTypeId });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 5. crm_status_list
    server.tool(
        'crm_status_list',
        'List CRM dictionary statuses, stages, and source lists (e.g. ENTITY_ID: STATUS, DEAL_STAGE_2, SOURCE).',
        {
            filter: server.z.record(server.z.any()).optional().describe('Filter criteria (e.g. { ENTITY_ID: "SOURCE" })'),
            order: server.z.record(server.z.any()).optional().describe('Sorting order')
        },
        async ({ filter, order }: any) => {
            const params: Record<string, any> = {};
            if (filter) params.filter = filter;
            if (order) params.order = order;
            const result = await callBitrixReadOnly('crm.status.list', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 6. crm_stagehistory_list
    server.tool(
        'crm_stagehistory_list',
        'List stage transition history for Leads (1) or Deals (2).',
        {
            entityTypeId: server.z.union([server.z.literal(1), server.z.literal(2)]).describe('Entity type ID: 1 (Lead), 2 (Deal)'),
            filter: server.z.record(server.z.any()).optional().describe('Filter object (e.g. { OWNER_ID: 123 })'),
            order: server.z.record(server.z.any()).optional().describe('Sorting order'),
            select: server.z.array(server.z.string()).optional().describe('Fields to select'),
            start: server.z.number().optional().describe('Pagination start')
        },
        async ({ entityTypeId, filter, order, select, start }: any) => {
            const params: Record<string, any> = { entityTypeId };
            if (filter) params.filter = filter;
            if (order) params.order = order;
            if (select) params.select = select;
            if (start !== undefined) params.start = start;

            const result = await callBitrixReadOnly('crm.stagehistory.list', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 7. crm_activity_list
    server.tool(
        'crm_activity_list',
        'List CRM activities (calls, meetings, tasks, emails) with filtering.',
        {
            filter: server.z.record(server.z.any()).optional().describe('Filter object (e.g. { OWNER_TYPE_ID: 1, OWNER_ID: 123 })'),
            order: server.z.record(server.z.any()).optional().describe('Sorting order'),
            select: server.z.array(server.z.string()).optional().describe('Fields to select'),
            start: server.z.number().optional().describe('Pagination start')
        },
        async ({ filter, order, select, start }: any) => {
            const params: Record<string, any> = {};
            if (filter) params.filter = filter;
            if (order) params.order = order;
            if (select) params.select = select;
            if (start !== undefined) params.start = start;

            const result = await callBitrixReadOnly('crm.activity.list', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 8. tasks_task_list
    server.tool(
        'tasks_task_list',
        'List tasks with filter, order, and select options.',
        {
            filter: server.z.record(server.z.any()).optional().describe('Filter object (e.g. { RESPONSIBLE_ID: 14, "!REAL_STATUS": 5 })'),
            order: server.z.record(server.z.any()).optional().describe('Sorting order'),
            select: server.z.array(server.z.string()).optional().describe('Fields to select'),
            start: server.z.number().optional().describe('Pagination start')
        },
        async ({ filter, order, select, start }: any) => {
            const params: Record<string, any> = {};
            if (filter) params.filter = filter;
            if (order) params.order = order;
            if (select) params.select = select;
            if (start !== undefined) params.start = start;

            const result = await callBitrixReadOnly('tasks.task.list', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );

    // 9. user_get
    server.tool(
        'user_get',
        'Get Bitrix user profile list and details.',
        {
            filter: server.z.record(server.z.any()).optional().describe('Filter object (e.g. { ACTIVE: true, ID: [14, 16, 18] })'),
            sort: server.z.string().optional().describe('Sort field'),
            order: server.z.string().optional().describe('Sort order (ASC/DESC)')
        },
        async ({ filter, sort, order }: any) => {
            const params: Record<string, any> = {};
            if (filter) params.filter = filter;
            if (sort) params.sort = sort;
            if (order) params.order = order;

            const result = await callBitrixReadOnly('user.get', params);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }
    );
};
