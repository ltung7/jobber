import type { RequestHandler } from '@sveltejs/kit';
import {
    verifySignedOAuthCode,
    createSignedMcpAccessToken,
    verifyPkce,
    safeCompare
} from '$lib/server/mcp/bitrix/auth';
import {
    getMcpSecretToken,
    getMcpOAuthClientId,
    getMcpOAuthClientSecret
} from '$lib/server/mcp/bitrix/config';

export const POST: RequestHandler = async ({ request }) => {
    const contentType = request.headers.get('content-type') || '';
    let grantType = '';
    let code = '';
    let codeVerifier = '';
    let clientId = '';
    let clientSecret = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        grantType = params.get('grant_type') || '';
        code = params.get('code') || '';
        codeVerifier = params.get('code_verifier') || '';
        clientId = params.get('client_id') || '';
        clientSecret = params.get('client_secret') || '';
    } else if (contentType.includes('application/json')) {
        const body = await request.json();
        grantType = body.grant_type || '';
        code = body.code || '';
        codeVerifier = body.code_verifier || '';
        clientId = body.client_id || '';
        clientSecret = body.client_secret || '';
    }

    if (grantType === 'authorization_code') {
        const verifiedCode = verifySignedOAuthCode(code);
        if (!verifiedCode) {
            return new Response(JSON.stringify({
                error: 'invalid_grant',
                error_description: 'Authorization code is invalid, expired, or tampered.'
            }), {
                status: 400,
                headers: { 'content-type': 'application/json' }
            });
        }

        if (verifiedCode.codeChallenge) {
            const pkceValid = verifyPkce(codeVerifier, verifiedCode.codeChallenge, verifiedCode.codeChallengeMethod);
            if (!pkceValid) {
                return new Response(JSON.stringify({
                    error: 'invalid_grant',
                    error_description: 'PKCE code_verifier validation failed.'
                }), {
                    status: 400,
                    headers: { 'content-type': 'application/json' }
                });
            }
        }

        const accessToken = createSignedMcpAccessToken({
            uid: verifiedCode.uid,
            email: verifiedCode.email
        });

        return new Response(JSON.stringify({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 30 * 24 * 60 * 60,
            email: verifiedCode.email
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    }

    if (grantType === 'client_credentials') {
        const expectedClientId = getMcpOAuthClientId();
        const expectedClientSecret = getMcpOAuthClientSecret();

        if (clientId === expectedClientId && safeCompare(clientSecret, expectedClientSecret)) {
            const secretToken = getMcpSecretToken();
            return new Response(JSON.stringify({
                access_token: secretToken,
                token_type: 'Bearer',
                expires_in: 365 * 24 * 60 * 60
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'invalid_client' }), {
            status: 401,
            headers: { 'content-type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
    });
};
