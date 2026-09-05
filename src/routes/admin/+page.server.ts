import { redirect, fail } from '@sveltejs/kit';
import admin from 'firebase-admin';
import type { Actions, PageServerLoad } from './$types';

// Protect the route
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	return { user: locals.user };
};

// Create user action
export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const displayName = data.get('displayName')?.toString().trim() ?? '';

		// Validate
		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email, displayName });
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters', email, displayName });
		}

		if (!email.includes('@')) {
			return fail(400, { error: 'Invalid email address', email, displayName });
		}

		try {
			const userRecord = await admin.auth().createUser({
				email,
				password,
				displayName: displayName || undefined,
			});

			return { success: true, uid: userRecord.uid, email: userRecord.email };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to create user';

			// Handle Firebase Auth errors
			if (message.includes('email-already-exists')) {
				return fail(400, { error: 'A user with this email already exists', email, displayName });
			}
			if (message.includes('invalid-email')) {
				return fail(400, { error: 'Invalid email address', email, displayName });
			}

			return fail(500, { error: message, email, displayName });
		}
	}
};
