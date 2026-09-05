import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_FIREBASE_REALTIME_URL } from '$env/static/public';
import { initializeApp, getApps, type App } from 'firebase-admin/app';
import admin from 'firebase-admin';
import type { Handle } from '@sveltejs/kit';

const firebaseConfig = { projectId: PUBLIC_FIREBASE_PROJECT_ID, databaseURL: PUBLIC_FIREBASE_REALTIME_URL }
let app: App | null;

export const initialize = () => {
    if (app) return app;
    const apps = getApps();
    if (apps.length) return app = apps[0];
    return initializeApp(firebaseConfig);
};

initialize()

// SvelteKit handles authentication via session cookies
// The __session cookie is set when the client creates a session cookie on the server
export const handle: Handle = async ({ event, resolve }) => {
	// Get the session cookie from the client
	const session = event.cookies.get('__session');

	if (session) {
		try {
			// Verify the session cookie (true = check revocation)
			const decoded = await admin.auth().verifySessionCookie(session, true);
			// Populate user data on the event so it's available in actions/routes
			event.locals.user = {
				uid: decoded.uid,
				email: decoded.email,
				displayName: decoded.displayName,
				photoURL: decoded.photoURL,
			};
		} catch (err) {
			// Invalid/expired session → clear the cookie
			event.cookies.delete('__session', { path: '/' });
		}
	}

	return resolve(event);
};