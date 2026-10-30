import crypto from 'crypto';
import { getMcpSecretToken } from './config';

export interface McpAuthResult {
    authenticated: boolean;
    accountId: string;
    clientIp: string;
    userAgent: string;
    email?: string;
}

export interface OAuthCodePayload {
    uid: string;
    email: string;
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    exp: number; // Unix timestamp in ms
}

export interface McpAccessTokenPayload {
    uid: string;
    email: string;
    iat: number;
    exp: number; // Unix timestamp in ms
}

// Allowed email domains for corporate authentication (array syntax preserved for future additions)
export const ALLOWED_DOMAINS = ['finnergroup.com'];

export const isAllowedEmail = (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const domain = email.split('@').pop()?.toLowerCase();
    return Boolean(domain && ALLOWED_DOMAINS.includes(domain));
};

export const safeCompare = (a?: string, b?: string): boolean => {
    if (!a || !b) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

const base64UrlEncode = (str: string): string => {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const base64UrlDecode = (str: string): string => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
};

const signHmac = (payloadStr: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
};

/**
 * Creates a signed OAuth 2.0 authorization code valid for 5 minutes
 */
export const createSignedOAuthCode = (payload: Omit<OAuthCodePayload, 'exp'> & { exp?: number }): string => {
    const secret = getMcpSecretToken();
    const fullPayload: OAuthCodePayload = {
        ...payload,
        email: payload.email.toLowerCase().trim(),
        exp: payload.exp || Date.now() + 5 * 60 * 1000 // 5 minutes validity
    };
    const jsonStr = JSON.stringify(fullPayload);
    const encodedPayload = base64UrlEncode(jsonStr);
    const signature = signHmac(encodedPayload, secret);
    return `mcp_code_${encodedPayload}.${signature}`;
};

/**
 * Verifies and decodes a signed OAuth 2.0 authorization code
 */
export const verifySignedOAuthCode = (codeStr: string): OAuthCodePayload | null => {
    if (!codeStr || !codeStr.startsWith('mcp_code_')) return null;
    const raw = codeStr.substring('mcp_code_'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const secret = getMcpSecretToken();
    const expectedSig = signHmac(encodedPayload, secret);

    if (!safeCompare(signature, expectedSig)) {
        return null;
    }

    try {
        const jsonStr = base64UrlDecode(encodedPayload);
        const payload = JSON.parse(jsonStr) as OAuthCodePayload;

        if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
            return null; // Expired
        }

        if (!isAllowedEmail(payload.email)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
};

/**
 * Creates an HMAC-signed Bearer access token valid for 30 days
 */
export const createSignedMcpAccessToken = (payload: { uid: string; email: string; exp?: number }): string => {
    const secret = getMcpSecretToken();
    const now = Date.now();
    const tokenPayload: McpAccessTokenPayload = {
        uid: payload.uid,
        email: payload.email.toLowerCase().trim(),
        iat: now,
        exp: payload.exp || now + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    const jsonStr = JSON.stringify(tokenPayload);
    const encodedPayload = base64UrlEncode(jsonStr);
    const signature = signHmac(encodedPayload, secret);
    return `mcp_u_${encodedPayload}.${signature}`;
};

/**
 * Verifies and decodes an HMAC-signed user access token
 */
export const verifySignedMcpAccessToken = (tokenStr: string): McpAccessTokenPayload | null => {
    if (!tokenStr || !tokenStr.startsWith('mcp_u_')) return null;
    const raw = tokenStr.substring('mcp_u_'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const secret = getMcpSecretToken();
    const expectedSig = signHmac(encodedPayload, secret);

    if (!safeCompare(signature, expectedSig)) {
        return null;
    }

    try {
        const jsonStr = base64UrlDecode(encodedPayload);
        const payload = JSON.parse(jsonStr) as McpAccessTokenPayload;

        if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
            return null; // Expired
        }

        if (!isAllowedEmail(payload.email)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
};

/**
 * Verifies PKCE code_verifier against code_challenge (supports S256 and plain)
 */
export const verifyPkce = (
    codeVerifier?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string
): boolean => {
    if (!codeChallenge) return true; // No PKCE requested
    if (!codeVerifier) return false;

    const method = (codeChallengeMethod || 'plain').toUpperCase();
    if (method === 'PLAIN') {
        return safeCompare(codeVerifier, codeChallenge);
    }

    if (method === 'S256') {
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        const computed = hash
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return safeCompare(computed, codeChallenge);
    }

    return false;
};

export const verifyMcpRequest = (request: Request): McpAuthResult => {
    const authHeader = request.headers.get('authorization') || '';
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');

    const pathSegments = url.pathname.split('/');
    const pathToken = pathSegments[pathSegments.length - 1];

    const secretToken = getMcpSecretToken();

    let authenticated = false;
    let accountId = 'anonymous';
    let verifiedEmail: string | undefined = undefined;

    // Check 1: Authorization: Bearer <token>
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();

        // Check if it's an HMAC-signed Firebase OAuth user access token (mcp_u_...)
        if (token.startsWith('mcp_u_')) {
            const userPayload = verifySignedMcpAccessToken(token);
            if (userPayload) {
                authenticated = true;
                accountId = userPayload.email;
                verifiedEmail = userPayload.email;
            }
        } else if (safeCompare(token, secretToken)) {
            // Static secret token fallback
            authenticated = true;
            accountId = 'static-bearer-client';
        }
    }

    // Check 2: ?token=<token> query parameter
    if (!authenticated && queryToken) {
        if (queryToken.startsWith('mcp_u_')) {
            const userPayload = verifySignedMcpAccessToken(queryToken);
            if (userPayload) {
                authenticated = true;
                accountId = userPayload.email;
                verifiedEmail = userPayload.email;
            }
        } else if (safeCompare(queryToken, secretToken)) {
            authenticated = true;
            accountId = 'static-query-client';
        }
    }

    // Check 3: /mcp/<token> path parameter
    if (!authenticated && pathToken && pathToken !== 'mcp') {
        if (pathToken.startsWith('mcp_u_')) {
            const userPayload = verifySignedMcpAccessToken(pathToken);
            if (userPayload) {
                authenticated = true;
                accountId = userPayload.email;
                verifiedEmail = userPayload.email;
            }
        } else if (safeCompare(pathToken, secretToken)) {
            authenticated = true;
            accountId = 'static-path-client';
        }
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('cf-connecting-ip') ||
        '127.0.0.1';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
        authenticated,
        accountId,
        clientIp,
        userAgent,
        email: verifiedEmail
    };
};
