import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
    const origin = url.origin;
    const metadata = {
        issuer: origin,
        authorization_endpoint: `${origin}/oauth/authorize`,
        token_endpoint: `${origin}/oauth/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'client_credentials'],
        code_challenge_methods_supported: ['S256', 'plain']
    };

    return new Response(JSON.stringify(metadata, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' }
    });
};
