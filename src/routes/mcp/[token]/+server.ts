import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createBitrixMcpServer } from '$lib/server/mcp/bitrix/server';
import { verifyMcpRequest } from '$lib/server/mcp/bitrix/auth';
import type { RequestHandler } from '@sveltejs/kit';

const handleMcpRequest: RequestHandler = async ({ request }) => {
    const auth = verifyMcpRequest(request);
    if (!auth.authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized MCP request.' }), {
            status: 401,
            headers: { 'content-type': 'application/json' }
        });
    }

    const server = createBitrixMcpServer(auth);
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    await server.connect(transport);
    return transport.handleRequest(request);
};

export const POST: RequestHandler = handleMcpRequest;
export const GET: RequestHandler = handleMcpRequest;
export const DELETE: RequestHandler = handleMcpRequest;
export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type, accept, mcp-session-id, mcp-protocol-version'
        }
    });
};
