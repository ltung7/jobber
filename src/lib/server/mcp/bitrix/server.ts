import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerLowLevelTools } from './tools.lowlevel';
import { registerHighLevelTools } from './tools.highlevel';
import { setBitrixMcpLog } from '$lib/server/db/firebase/bitrixMcpLog.fdb';
import type { McpAuthResult } from './auth';

export const createBitrixMcpServer = (authContext?: Partial<McpAuthResult>) => {
    const server = new McpServer({
        name: 'bitrix-read-only-mcp',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {}
        }
    });

    const accountId = authContext?.accountId || 'claude-mcp';
    const clientIp = authContext?.clientIp || '127.0.0.1';
    const userAgent = authContext?.userAgent || 'mcp-client';

    // Attach Zod to server instance for tool definitions
    (server as any).z = z;

    // Intercept server.tool so every registered tool automatically logs to Firestore via bitrixMcpLog.fdb.ts
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

    // Register low-level and high-level tools
    registerLowLevelTools(server);
    registerHighLevelTools(server);

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
    bitrixMethods: string[],
    params: Record<string, any>,
    executor: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();
    const logId = `log_${startTime}_${Math.random().toString(36).substring(2, 8)}`;

    try {
        const result = await executor();
        const durationMs = Date.now() - startTime;

        try {
            await setBitrixMcpLog(accountId, logId, {
                accountId,
                clientIp,
                userAgent,
                toolName,
                bitrixMethods,
                params,
                status: 'SUCCESS',
                durationMs,
                createdAt: new Date().toISOString()
            });
        } catch (logErr) {
            console.error('[MCP Audit Logger Warning]: Failed to write audit log to Firestore:', logErr);
        }

        return result;
    } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const isBlocked = err.name === 'BitrixReadOnlyViolationError' || err.name === 'BitrixEntityTypeViolationError';

        try {
            await setBitrixMcpLog(accountId, logId, {
                accountId,
                clientIp,
                userAgent,
                toolName,
                bitrixMethods,
                params,
                status: isBlocked ? 'BLOCKED_WRITE_ATTEMPT' : 'ERROR',
                errorMessage: err.message,
                durationMs,
                createdAt: new Date().toISOString()
            });
        } catch (logErr) {
            console.error('[MCP Audit Logger Warning]: Failed to write error audit log to Firestore:', logErr);
        }

        throw err;
    }
}
