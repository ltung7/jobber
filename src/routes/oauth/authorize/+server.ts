import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const clientId = url.searchParams.get('client_id');

    if (!redirectUri) {
        return new Response('Missing redirect_uri', { status: 400 });
    }

    // Auto-approve and redirect back with auth code for Claude Custom Connector
    const authCode = 'mcp_auth_code_' + Math.random().toString(36).substring(2);
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }

    return Response.redirect(redirectUrl.toString(), 302);
};
