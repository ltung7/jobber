import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import admin from 'firebase-admin';
import { initialize } from '$lib/server/db/firebase/firebase';
import { createBitrixMcpServer } from '$lib/server/mcp/bitrix/server';
import {
    verifyMcpRequest,
    createSignedOAuthCode,
    verifySignedOAuthCode,
    createSignedMcpAccessToken,
    verifyPkce,
    ALLOWED_DOMAINS,
    isAllowedEmail,
    safeCompare
} from '$lib/server/mcp/bitrix/auth';
import {
    getMcpSecretToken,
    getMcpOAuthClientId,
    getMcpOAuthClientSecret
} from '$lib/server/mcp/bitrix/config';
import { setBitrixMcpLog } from '$lib/server/db/firebase/bitrixMcpLog.fdb';

const PORT = Number(process.env.PORT || 8080);
const FIREBASE_API_KEY = process.env.PUBLIC_FIREBASE_APIKEY || 'AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M';
const FIREBASE_AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'eisg-fleet.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || 'eisg-fleet';

// Initialize firebase admin on startup
initialize();

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
            auth: 'firebase-google-oauth2',
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

    // 3. OAuth 2.0 Authorize Endpoint
    if (pathname === '/oauth/authorize') {
        if (req.method === 'GET') {
            const redirectUri = fullUrl.searchParams.get('redirect_uri') || '';
            const state = fullUrl.searchParams.get('state') || '';
            const codeChallenge = fullUrl.searchParams.get('code_challenge') || '';
            const codeChallengeMethod = fullUrl.searchParams.get('code_challenge_method') || '';

            if (!redirectUri) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Missing required redirect_uri parameter');
                return;
            }

            // Render Firebase Authentication UI with Google Sign-In and Email/Password
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EISG Bitrix MCP — Secure Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            width: 100%;
            max-width: 420px;
            padding: 36px 32px;
        }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge {
            display: inline-block;
            background: #0284c7;
            color: white;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        h2 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        p.subtitle { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .badge-domains {
            background: rgba(14, 165, 233, 0.12);
            color: #38bdf8;
            padding: 2px 8px;
            border-radius: 6px;
            font-weight: 600;
        }
        .btn-google {
            width: 100%;
            background: #ffffff;
            color: #0f172a;
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn-google:hover { background: #f1f5f9; transform: translateY(-1px); }
        .btn-google svg { width: 18px; height: 18px; }
        .divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
        }
        .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #334155;
        }
        .divider span { padding: 0 12px; text-transform: uppercase; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        input[type="email"], input[type="password"] {
            width: 100%;
            padding: 10px 14px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        input:focus { outline: none; border-color: #38bdf8; }
        .btn-submit {
            width: 100%;
            background: #0284c7;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-submit:hover { background: #0369a1; }
        .error-box {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 16px;
            display: none;
            line-height: 1.4;
        }
        .loading-spinner {
            display: none;
            text-align: center;
            color: #38bdf8;
            font-size: 13px;
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <span class="logo-badge">EISG BITRIX MCP</span>
            <h2>Sign in to continue</h2>
            <p class="subtitle">Access restricted to verified accounts from <span class="badge-domains">@eisg.pl</span> and <span class="badge-domains">@finnergroup.com</span></p>
        </div>

        <div id="error-box" class="error-box"></div>

        <!-- Google Sign-In -->
        <button id="btn-google" class="btn-google">
            <svg viewBox="0 0 48 48">
                <path fill="#ea4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C36.91 2.7 31.11 0 24 0 14.62 0 6.51 5.38 2.42 13.12l7.33 5.7C12.42 13.16 17.18 9.5 24 9.5z"/>
                <path fill="#4285f4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.13h12.94c-.58 2.96-2.27 5.48-4.78 7.18l7.34 5.7c4.29-3.97 7.15-9.83 7.15-16.72z"/>
                <path fill="#fbbc05" d="M10.53 28.59c-.48-1.45-.76-3-0-4.59l-7.33-5.7C.89 20.46 0 24.65 0 29.5c0 4.84 2.65 9.09 6.56 11.31l7.33-5.7c-2.09-2.04-3.47-4.93-3.47-8.31z"/>
                <path fill="#34a853" d="M24 48c13.07 0 24.02-4.33 32.08-11.79l-7.34-5.7c-2.58 2.19-5.88 3.49-9.74 3.49-7.82 0-14.58-5.19-16.99-12.34l-7.33 5.7c4.98 9.39 15.04 16.02 26.32 16.02z"/>
            </svg>
            Sign in with Google
        </button>

        <div class="divider"><span>or with password</span></div>

        <!-- Email & Password Form -->
        <form id="login-form">
            <div class="form-group">
                <label for="email">Corporate Email</label>
                <input type="email" id="email" required placeholder="name@eisg.pl" autocomplete="username">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" required placeholder="••••••••" autocomplete="current-password">
            </div>
            <button type="submit" id="btn-submit" class="btn-submit">Sign In</button>
        </form>

        <div id="loading-spinner" class="loading-spinner">Verifying credentials with Firebase...</div>

        <!-- Hidden POST Form to finish OAuth redirect -->
        <form id="oauth-post-form" method="POST" action="/oauth/authorize" style="display:none;">
            <input type="hidden" name="id_token" id="form-id-token">
            <input type="hidden" name="redirect_uri" value="${redirectUri}">
            <input type="hidden" name="state" value="${state}">
            <input type="hidden" name="code_challenge" value="${codeChallenge}">
            <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
        </form>
    </div>

    <!-- Firebase JS SDK (v10 modular via gstatic) -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
        import {
            getAuth,
            GoogleAuthProvider,
            signInWithPopup,
            signInWithEmailAndPassword
        } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "${FIREBASE_API_KEY}",
            authDomain: "${FIREBASE_AUTH_DOMAIN}",
            projectId: "${FIREBASE_PROJECT_ID}"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });

        const errorBox = document.getElementById('error-box');
        const spinner = document.getElementById('loading-spinner');
        const postForm = document.getElementById('oauth-post-form');
        const idTokenInput = document.getElementById('form-id-token');

        function showError(msg) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
            spinner.style.display = 'none';
        }

        async function submitFirebaseToken(userCredential) {
            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const idToken = await userCredential.user.getIdToken();
                idTokenInput.value = idToken;
                postForm.submit();
            } catch (err) {
                showError(err.message || 'Failed to acquire Firebase ID token');
            }
        }

        // Google Sign-In Handler
        document.getElementById('btn-google').addEventListener('click', async () => {
            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const result = await signInWithPopup(auth, googleProvider);
                await submitFirebaseToken(result);
            } catch (err) {
                showError(err.message || 'Google sign-in was cancelled or failed');
            }
        });

        // Email & Password Handler
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const result = await signInWithEmailAndPassword(auth, email, password);
                await submitFirebaseToken(result);
            } catch (err) {
                showError(err.message || 'Invalid email or password');
            }
        });
    </script>
</body>
</html>`;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }

        if (req.method === 'POST') {
            const bodyText = await readBody(req);
            const params = new URLSearchParams(bodyText);
            const idToken = params.get('id_token') || '';
            const redirectUri = params.get('redirect_uri') || '';
            const state = params.get('state') || '';
            const codeChallenge = params.get('code_challenge') || undefined;
            const codeChallengeMethod = params.get('code_challenge_method') || undefined;

            if (!redirectUri) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Missing redirect_uri');
                return;
            }

            if (!idToken) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h3>Authentication Error</h3><p>Missing Firebase ID token.</p><a href="javascript:history.back()">Back</a>');
                return;
            }

            try {
                // Verify the cryptographic Firebase ID token on server
                const decoded = await admin.auth().verifyIdToken(idToken, true);
                const email = (decoded.email || '').toLowerCase().trim();

                if (!isAllowedEmail(email)) {
                    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<h3>Access Denied</h3><p>Email <b>${email}</b> is not authorized. Access is strictly restricted to @eisg.pl and @finnergroup.com.</p><a href="javascript:history.back()">Back</a>`);
                    return;
                }

                // Generate short-lived HMAC-signed OAuth code
                const authCode = createSignedOAuthCode({
                    uid: decoded.uid,
                    email,
                    redirectUri,
                    codeChallenge,
                    codeChallengeMethod
                });

                const redirectUrl = new URL(redirectUri);
                redirectUrl.searchParams.set('code', authCode);
                if (state) redirectUrl.searchParams.set('state', state);

                res.writeHead(302, { Location: redirectUrl.toString() });
                res.end();
                return;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Token verification failed';
                res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h3>Authentication Failed</h3><p>${message}</p><a href="javascript:history.back()">Try again</a>`);
                return;
            }
        }
    }

    // 4. OAuth 2.0 Token Exchange Endpoint
    if (pathname === '/oauth/token' && req.method === 'POST') {
        const bodyText = await readBody(req);
        let grantType = '';
        let code = '';
        let codeVerifier = '';
        let clientId = '';
        let clientSecret = '';

        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            try {
                const jsonBody = JSON.parse(bodyText);
                grantType = jsonBody.grant_type || '';
                code = jsonBody.code || '';
                codeVerifier = jsonBody.code_verifier || '';
                clientId = jsonBody.client_id || '';
                clientSecret = jsonBody.client_secret || '';
            } catch {
                // ignore
            }
        } else {
            const params = new URLSearchParams(bodyText);
            grantType = params.get('grant_type') || '';
            code = params.get('code') || '';
            codeVerifier = params.get('code_verifier') || '';
            clientId = params.get('client_id') || '';
            clientSecret = params.get('client_secret') || '';
        }

        // Authorization Code Grant
        if (grantType === 'authorization_code') {
            const verifiedCode = verifySignedOAuthCode(code);
            if (!verifiedCode) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'invalid_grant',
                    error_description: 'Authorization code is invalid, expired, or tampered.'
                }));
                return;
            }

            // Verify PKCE if code_challenge was provided
            if (verifiedCode.codeChallenge) {
                const pkceValid = verifyPkce(codeVerifier, verifiedCode.codeChallenge, verifiedCode.codeChallengeMethod);
                if (!pkceValid) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'invalid_grant',
                        error_description: 'PKCE code_verifier validation failed.'
                    }));
                    return;
                }
            }

            // Issue HMAC-signed user access token
            const accessToken = createSignedMcpAccessToken({
                uid: verifiedCode.uid,
                email: verifiedCode.email
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 30 * 24 * 60 * 60, // 30 days
                email: verifiedCode.email
            }));
            return;
        }

        // Client Credentials Grant
        if (grantType === 'client_credentials') {
            const expectedClientId = getMcpOAuthClientId();
            const expectedClientSecret = getMcpOAuthClientSecret();

            if (clientId === expectedClientId && safeCompare(clientSecret, expectedClientSecret)) {
                const secretToken = getMcpSecretToken();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    access_token: secretToken,
                    token_type: 'Bearer',
                    expires_in: 365 * 24 * 60 * 60
                }));
                return;
            }

            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid_client' }));
            return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
        return;
    }

    // 5. MCP Streamable HTTP Endpoints: /mcp and /mcp/:token
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
            res.end(JSON.stringify({
                error: 'Unauthorized. Access restricted to authorized users (@eisg.pl, @finnergroup.com) with valid Firebase OAuth credentials.'
            }));
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
