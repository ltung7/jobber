import { env } from '$env/dynamic/private';

export const ALLOWED_BITRIX_METHODS = new Set([
    'crm.item.list',
    'crm.item.get',
    'crm.item.fields',
    'crm.category.list',
    'crm.status.list',
    'crm.stagehistory.list',
    'crm.activity.list',
    'tasks.task.list',
    'user.get'
] as const);

// 1=Lead, 2=Deal, 3=Contact, 7=Quote (Oferta)
// 4=Company, 5=Invoice(old), 8=Requisite, 31=Invoice, 36/39=Documents, >=128=SPA stay blocked:
// they carry bank/requisite/financial or legal-document data that BLOCKED_FIELD_KEYS does not cover.
export const ALLOWED_CRM_ENTITY_TYPES = new Set([1, 2, 3, 7]);

// Methods whose entityTypeId must go through ALLOWED_CRM_ENTITY_TYPES
export const ENTITY_SCOPED_METHODS = new Set([
    'crm.item.list',
    'crm.item.get',
    'crm.item.fields',
    'crm.category.list',
    'crm.stagehistory.list'
] as const);

export const BLOCKED_FIELD_KEYS = new Set([
    'photo',
    'PHOTO',
    'files',
    'FILES',
    'webdavElements',
    'WEBDAV_ELEMENTS',
    'storageElementIds',
    'STORAGE_ELEMENT_IDS',
    // Sensitive portal credentials on deals
    'UF_CRM_1787749528909',
    'ufCrm1787749528909',
    'UF_CRM_1787749544391',
    'ufCrm1787749544391',
    'UF_CRM_1787751004012',
    'ufCrm1787751004012',
    'UF_CRM_1787751012720',
    'ufCrm1787751012720'
]);

export const USER_ALIASES: Record<string, number> = {
    'ramod': 14,
    'dhan': 16,
    'karki': 16,
    'dk': 16,
    'darya': 18,
    'michał': 1,
    'michal': 1,
    'task manager': 26,
    'legalizacja': 26
};

export const getBitrixWebhookUrl = (): string => {
    const url = env.BITRIX24_WEBHOOK_URL || process.env.BITRIX24_WEBHOOK_URL;
    if (!url) {
        throw new Error('BITRIX24_WEBHOOK_URL is not configured in environment variables.');
    }
    return url.replace(/\/$/, '');
};

export const getMcpSecretToken = (): string => {
    return env.MCP_SECRET_TOKEN || process.env.MCP_SECRET_TOKEN || 'nUYbkGydwzTBJoYSAQKbRblOA1L8gY3OEOgcCuTowTlvGeykoChjVFD7rDqKdDYa';
};

export const getMcpOAuthClientId = (): string => {
    return env.MCP_OAUTH_CLIENT_ID || process.env.MCP_OAUTH_CLIENT_ID || 'eisg-bitrix-mcp-client';
};

export const getMcpOAuthClientSecret = (): string => {
    return env.MCP_OAUTH_CLIENT_SECRET || process.env.MCP_OAUTH_CLIENT_SECRET || 'eisg-bitrix-mcp-secret-key-987654321';
};
