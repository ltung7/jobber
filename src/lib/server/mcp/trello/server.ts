import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerTrelloTools } from './tools';
import { setTrelloMcpLog } from '$lib/server/db/firebase/trelloMcpLog.fdb';
import type { McpAuthResult } from '$lib/server/mcp/bitrix/auth';

export const createTrelloMcpServer = (authContext?: Partial<McpAuthResult>) => {
    const server = new McpServer({
        name: 'trello-card-assignment-mcp',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });

    const accountId = authContext?.accountId || 'claude-mcp';
    const clientIp = authContext?.clientIp || '127.0.0.1';
    const userAgent = authContext?.userAgent || 'mcp-client';

    // Attach Zod to server instance
    (server as any).z = z;

    // Intercept server.tool so every tool call logs to Firestore via trelloMcpLog.fdb.ts
    const originalTool = server.tool.bind(server);
    (server as any).tool = (name: string, description: string, schema: any, handler: (...args: any[]) => Promise<any>) => {
        const wrappedHandler = async (args: Record<string, any>, extra: any) => {
            return executeWithAuditLogging(
                accountId,
                clientIp,
                userAgent,
                name,
                [name],
                args || {},
                () => handler(args, extra)
            );
        };
        return (originalTool as any)(name, description, schema, wrappedHandler);
    };

    registerTrelloTools(server);

    return server;
};

/**
 * Middleware helper to wrap MCP tool execution with Firestore audit logging
 */
export async function executeWithAuditLogging<T>(
    accountId: string,
    clientIp: string,
    userAgent: string,
    toolName: string,
    trelloMethods: string[],
    params: Record<string, any>,
    executor: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();
    const logId = `trello_log_${startTime}_${Math.random().toString(36).substring(2, 8)}`;

    try {
        const result = await executor();
        const durationMs = Date.now() - startTime;

        try {
            await setTrelloMcpLog(accountId, logId, {
                accountId,
                clientIp,
                userAgent,
                toolName,
                trelloMethods,
                params,
                status: 'SUCCESS',
                resultSummary: typeof result === 'object' && result !== null ? (result as Record<string, any>) : undefined,
                durationMs,
                createdAt: new Date().toISOString()
            });
        } catch (logErr) {
            console.error('[Trello MCP Audit Logger Warning]: Failed to write audit log to Firestore:', logErr);
        }

        return result;
    } catch (err: any) {
        const durationMs = Date.now() - startTime;

        try {
            await setTrelloMcpLog(accountId, logId, {
                accountId,
                clientIp,
                userAgent,
                toolName,
                trelloMethods,
                params,
                status: 'ERROR',
                errorMessage: err.message,
                durationMs,
                createdAt: new Date().toISOString()
            });
        } catch (logErr) {
            console.error('[Trello MCP Audit Logger Warning]: Failed to log error to Firestore:', logErr);
        }

        throw err;
    }
}
