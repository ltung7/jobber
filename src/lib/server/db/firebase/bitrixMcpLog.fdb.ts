import { setItem, getItemById, getItems, addItem } from "./firebase";

const mainCollectionName: string = 'streamer';
const subCollectionName: string = 'bitrixMcpLogs';

const collectionRef = (accountId: string): string => [ mainCollectionName, accountId, subCollectionName ].join('/');

export interface BitrixMcpAuditLog {
    id?: string;
    accountId: string;           // Who: e.g. 'claude-agent' or client ID
    clientIp: string;            // Who: request IP (x-forwarded-for)
    userAgent: string;           // Who: User-Agent header
    toolName: string;            // What: MCP tool called (e.g. 'funnel_stats', 'crm_item_list')
    bitrixMethods: string[];     // What: Underlying Bitrix REST methods invoked
    params: Record<string, any>; // What: Input arguments
    status: 'SUCCESS' | 'BLOCKED_WRITE_ATTEMPT' | 'UNAUTHORIZED' | 'ERROR';
    recordCount?: number;
    errorMessage?: string;
    durationMs: number;
    createdAt: string;           // When: ISO-8601 timestamp (e.g. new Date().toISOString())
}

export const addBitrixMcpLog = async (accountId: string, data: BitrixMcpAuditLog) => {
    return addItem(data, collectionRef(accountId));
};

export const setBitrixMcpLog = async (accountId: string, id: string, data: Partial<BitrixMcpAuditLog>) => {
    return setItem(id, data, collectionRef(accountId), true);
};

export const getBitrixMcpLog = async <T = BitrixMcpAuditLog>(accountId: string, id: string): Promise<T | null> => {
    return getItemById(id, collectionRef(accountId));
};

export const findBitrixMcpLogs = async <T = BitrixMcpAuditLog>(
    accountId: string,
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionRef(accountId), query, select);
};
