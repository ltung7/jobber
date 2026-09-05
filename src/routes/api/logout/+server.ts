import admin from 'firebase-admin';
import { json, redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// Clear the session cookie
	cookies.delete('__session', { path: "/" });

	// Sign out from Firebase client-side as well (optional, for when client persists auth)
	try {
		if (locals.user?.uid) {
			await admin.auth().revokeRefreshTokens(locals.user.uid);
		}
	} catch {
		// ignore — cookie is cleared regardless
	}

	throw redirect(303, '/login');
};