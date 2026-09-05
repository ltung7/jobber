import admin from 'firebase-admin';
import { json, redirect, type RequestHandler } from '@sveltejs/kit';

// Allowed email domains for Google sign-in (add your own domains here)
const ALLOWED_DOMAINS = ['finnergroup.com', 'eisg.pl'];

function isAllowedDomain(email: string): boolean {
	const domain = email.split('@').pop()?.toLowerCase();
	return domain ? ALLOWED_DOMAINS.includes(domain) : false;
}

// POST /api/sessionLogin
// Client sends their Firebase ID token and provider, server creates a session cookie
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken, provider } = await request.json();

	if (!idToken) {
		return json({ error: 'Missing idToken' }, { status: 400 });
	}

	// Verify the ID token to get the user's claims (including email)
	const decoded = await admin.auth().verifyIdToken(idToken);
	const email = decoded.email;

	// Domain restriction: only for Google sign-in (pass provider='google' from client)
	if (provider === 'google' && email) {
		if (!isAllowedDomain(email)) {
			return json(
				{ error: `Email domain not allowed. Allowed domains: ${ALLOWED_DOMAINS.join(', ')}` },
				{ status: 403 }
			);
		}
	}

	// Session cookie expires in 5 days
	const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms

	const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

	// Set the session cookie on the client via the response
	cookies.set('__session', sessionCookie, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true, // only HTTPS
		maxAge: expiresIn / 1000,
	});

	return json({ success: true });
};