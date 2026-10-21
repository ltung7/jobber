import { getMcpSecretToken } from '$lib/server/mcp/bitrix/config';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    const contentType = request.headers.get('content-type') || '';
    let grantType = '';
    let code = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        grantType = params.get('grant_type') || '';
        code = params.get('code') || '';
    } else if (contentType.includes('application/json')) {
        const body = await request.json();
        grantType = body.grant_type;
        code = body.code;
    }

    const secretToken = getMcpSecretToken();

    const tokenResponse = {
        access_token: secretToken,
        token_type: 'Bearer',
        expires_in: 31536000,
        refresh_token: 'mcp_refresh_token_dummy'
    };

    return new Response(JSON.stringify(tokenResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' }
    });
};
