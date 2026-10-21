import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createBitrixMcpServer } from '$lib/server/mcp/bitrix/server';
import { verifyMcpRequest } from '$lib/server/mcp/bitrix/auth';
import { getMcpSecretToken } from '$lib/server/mcp/bitrix/config';
import { setBitrixMcpLog } from '$lib/server/db/firebase/bitrixMcpLog.fdb';

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_DOMAINS = ['eisg.pl', 'finnergroup.com'];

const setCorsHeaders = (res: http.ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, accept, mcp-session-id, mcp-protocol-version, x-user-email');
};

const readBody = (req: http.IncomingMessage): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;
    const fullUrl = new URL(req.url || '/', origin);
    const pathname = fullUrl.pathname.replace(/\/+$/, '') || '/';

    // 1. Health Check
    if (pathname === '/health' || pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            service: 'bitrix-read-only-mcp',
            mode: 'minimal-standalone-runner',
            status: 'ok',
            region: process.env.CLOUD_RUN_REGION || 'europe-central2',
            allowedDomains: ALLOWED_DOMAINS
        }));
        return;
    }

    // 2. OAuth 2.0 Discovery Metadata for Claude Custom Connector
    if (pathname === '/.well-known/oauth-authorization-server' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            issuer: origin,
            authorization_endpoint: `${origin}/oauth/authorize`,
            token_endpoint: `${origin}/oauth/token`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'client_credentials'],
            code_challenge_methods_supported: ['S256', 'plain']
        }, null, 2));
        return;
    }

    // 3. OAuth 2.0 Authorize (Domain-restricted login prompt or direct redirect)
    if (pathname === '/oauth/authorize' && req.method === 'GET') {
        const redirectUri = fullUrl.searchParams.get('redirect_uri');
        const state = fullUrl.searchParams.get('state');
        if (!redirectUri) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing redirect_uri');
            return;
        }

        // Return a lightweight HTML login page prompting for corporate email (@eisg.pl or @macropart.com)
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bitrix MCP Login</title>
            <style>
                body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); width: 350px; }
                input { width: 100%; padding: 10px; margin: 10px 0 20px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
                button { width: 100%; background: #3b82f6; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }
                button:hover { background: #2563eb; }
                .error { color: #ef4444; font-size: 14px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Bitrix24 MCP Login</h2>
                <p style="font-size: 13px; color: #94a3b8;">Restricted to @eisg.pl and @macropart.com</p>
                <form method="POST" action="/oauth/authorize">
                    <input type="hidden" name="redirect_uri" value="${redirectUri}">
                    <input type="hidden" name="state" value="${state || ''}">
                    <label>Corporate Email:</label>
                    <input type="email" name="email" required placeholder="name@eisg.pl">
                    <button type="submit">Authorize & Connect</button>
                </form>
            </div>
        </body>
        </html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    if (pathname === '/oauth/authorize' && req.method === 'POST') {
        const bodyText = await readBody(req);
        const params = new URLSearchParams(bodyText);
        const email = params.get('email') || '';
        const redirectUri = params.get('redirect_uri') || '';
        const state = params.get('state') || '';

        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
            res.writeHead(403, { 'Content-Type': 'text/html' });
            res.end(`<h3>Access Denied</h3><p>Email domain <b>@${domain || 'unknown'}</b> is not authorized. Access is restricted to @eisg.pl and @macropart.com.</p><a href="javascript:history.back()">Back</a>`);
            return;
        }

        const authCode = 'mcp_auth_code_' + Math.random().toString(36).substring(2);
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', authCode);
        if (state) redirectUrl.searchParams.set('state', state);

        res.writeHead(302, { Location: redirectUrl.toString() });
        res.end();
        return;
    }

    // 4. OAuth 2.0 Token Exchange
    if (pathname === '/oauth/token' && req.method === 'POST') {
        await readBody(req);
        const secretToken = getMcpSecretToken();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            access_token: secretToken,
            token_type: 'Bearer',
            expires_in: 31536000,
            refresh_token: 'mcp_refresh_token_dummy'
        }));
        return;
    }

    // 5. MCP Endpoints: /mcp and /mcp/:token
    if (pathname === '/mcp' || pathname.startsWith('/mcp/')) {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v);
            else if (Array.isArray(v)) headers.set(k, v.join(', '));
        }
        const webReq = new Request(fullUrl.toString(), { method: req.method, headers });
        const auth = verifyMcpRequest(webReq);

        if (!auth.authenticated) {
            try {
                await setBitrixMcpLog('unauthorized', `unauth_${Date.now()}`, {
                    accountId: 'unauthorized',
                    clientIp: auth.clientIp,
                    userAgent: auth.userAgent,
                    toolName: 'http_connect',
                    bitrixMethods: [],
                    params: { pathname },
                    status: 'UNAUTHORIZED',
                    durationMs: 0,
                    createdAt: new Date().toISOString()
                });
            } catch {
                // ignore
            }
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized. Access restricted to authorized users (@eisg.pl, @macropart.com).' }));
            return;
        }

        const mcpServer = createBitrixMcpServer(auth);
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
        });

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bitrix MCP Minimal Runner] Listening on http://0.0.0.0:${PORT}`);
});
