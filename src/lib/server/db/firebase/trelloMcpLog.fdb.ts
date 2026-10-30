import { setItem, getItemById, getItems, addItem } from "./firebase";

const mainCollectionName: string = 'streamer';
const subCollectionName: string = 'trelloMcpLogs';

const collectionRef = (accountId: string): string => [ mainCollectionName, accountId, subCollectionName ].join('/');

export interface TrelloMcpAuditLog {
    id?: string;
    accountId: string;           // Who: e.g. 'claude-agent' or client ID
    clientIp: string;            // Who: request IP (x-forwarded-for)
    userAgent: string;           // Who: User-Agent header
    toolName: string;            // What: MCP tool called
    trelloMethods: string[];     // What: Underlying Trello REST calls
    params: Record<string, any>; // What: Input arguments
    status: 'SUCCESS' | 'UNAUTHORIZED' | 'ERROR';
    resultSummary?: Record<string, any>;
    errorMessage?: string;
    durationMs: number;
    createdAt: string;           // When: ISO-8601 timestamp
}

export const addTrelloMcpLog = async (accountId: string, data: TrelloMcpAuditLog) => {
    return addItem(data, collectionRef(accountId));
};

export const setTrelloMcpLog = async (accountId: string, id: string, data: Partial<TrelloMcpAuditLog>) => {
    return setItem(id, data, collectionRef(accountId), true);
};

export const getTrelloMcpLog = async <T = TrelloMcpAuditLog>(accountId: string, id: string): Promise<T | null> => {
    return getItemById(id, collectionRef(accountId));
};

export const findTrelloMcpLogs = async <T = TrelloMcpAuditLog>(
    accountId: string,
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionRef(accountId), query, select);
};
