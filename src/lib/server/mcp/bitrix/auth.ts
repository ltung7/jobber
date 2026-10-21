import crypto from 'crypto';
import { getMcpSecretToken } from './config';

export interface McpAuthResult {
    authenticated: boolean;
    accountId: string;
    clientIp: string;
    userAgent: string;
    email?: string;
}

// Allowed email domains or specific user emails
const ALLOWED_DOMAINS = ['eisg.pl', 'finnergroup.com'];
const ALLOWED_EMAILS = new Array<string>(); // Add specific emails if needed, e.g. 'admin@eisg.pl'

export const verifyMcpRequest = (request: Request): McpAuthResult => {
    const authHeader = request.headers.get('authorization') || '';
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    
    const pathSegments = url.pathname.split('/');
    const pathToken = pathSegments[pathSegments.length - 1];

    const secretToken = getMcpSecretToken();

    let authenticated = false;
    let accountId = 'anonymous-client';
    let email = 'unknown';

    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    // Check if client provided email header (sent by authenticated proxies/harnesses)
    const clientEmail = request.headers.get('x-user-email') || request.headers.get('x-forwarded-email');

    // 1. Verify Secret Token (Bearer, Query, or Path)
    const isTokenValid = 
        (bearerToken && safeCompare(bearerToken, secretToken)) ||
        (queryToken && safeCompare(queryToken, secretToken)) ||
        (pathToken && safeCompare(pathToken, secretToken));

    if (isTokenValid) {
        if (clientEmail) {
            const domain = clientEmail.split('@')[1]?.toLowerCase();
            if (domain && ALLOWED_DOMAINS.includes(domain)) {
                authenticated = true;
                accountId = clientEmail;
                email = clientEmail;
            } else {
                authenticated = false; // Blocked due to domain restriction
            }
        } else {
            // If no email header is passed but token matches, allow trusted direct CLI/Claude clients
            // or enforce domain/email mapping if desired. Here we allow direct token clients.
            authenticated = true;
            accountId = 'token-client';
        }
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown-client';

    return {
        authenticated,
        accountId,
        clientIp,
        userAgent,
        email
    };
};

const safeCompare = (a: string, b: string): boolean => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
};
