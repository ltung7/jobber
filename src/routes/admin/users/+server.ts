import { error, isHttpError, json, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_FIREBASE_APIKEY } from '$env/static/public';
import admin from 'firebase-admin';

// POST /api/sessionLogin
// Client sends their Firebase ID token and provider, server creates a session cookie
export const GET: RequestHandler = async () => {
	// Fetch all users from Firebase Auth
	try {
		const listUsersResult = await admin.auth().listUsers();

		const users = listUsersResult.users.map((user) => ({
			uid: user.uid,
			email: user.email,
			displayName: user.displayName,
			photoURL: user.photoURL,
			disabled: user.disabled,
			createdAt: user.metadata?.creationTime,
			lastSignInAt: user.metadata?.lastSignInTime,
		}));

		return json({ success: true, users, total: users.length });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to fetch users';
		throw error(500, message);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	// Create a new user
	try {
		const { email, password, displayName } = await request.json();

		if (!email || !password) {
			throw error(400, 'Email and password are required');
		}

		const userRecord = await admin.auth().createUser({
			email,
			password,
			displayName: displayName || undefined,
		});

		return json({
			success: true,
			user: userRecord
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to create user';

		if (message.includes('email-already-exists')) {
			throw error(409, 'Email already exists');
		}
		if (message.includes('invalid-email')) {
			throw error(400, 'Invalid email address');
		}
		if (message.includes('weak-password')) {
			throw error(400, 'Password is too weak');
		}

		throw error(500, message);
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	// Update an existing user
	try {
		const { uid, displayName, disabled } = await request.json();

		if (!uid) {
			throw error(400, 'User UID is required');
		}

		const updateData: any = {};
		if (displayName !== undefined) {
			updateData.displayName = displayName;
		}
		if (disabled !== undefined) {
			updateData.disabled = disabled;
		}

		const userRecord = await admin.auth().updateUser(uid, updateData);

		return json({
			success: true,
			uid: userRecord.uid,
			email: userRecord.email,
			displayName: userRecord.displayName,
			disabled: userRecord.disabled,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to update user';

		if (message.includes('user-not-found')) {
			throw error(404, 'User not found');
		}

		throw error(500, message);
	}
};

export const DELETE: RequestHandler = async ({ url, fetch }) => {
	// Trigger Firebase's generic reset password email
	try {
		const uid = url.searchParams.get('uid');
		let email = url.searchParams.get('email');

		if (!uid && !email) {
			throw error(400, 'User UID or email is required');
		}

		if (!email && uid) {
			const userRecord = await admin.auth().getUser(uid);
			email = userRecord.email ?? null;
		}

		if (!email) {
			throw error(400, 'User does not have an email address');
		}

		const response = await fetch(
			`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${PUBLIC_FIREBASE_APIKEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestType: 'PASSWORD_RESET',
					email
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => null);
			const apiError = errorData?.error?.message || 'Failed to send password reset email';
			if (apiError === 'EMAIL_NOT_FOUND') {
				throw error(404, 'User not found');
			}
			throw error(response.status || 500, apiError);
		}

		return json({ success: true, email });
	} catch (err: unknown) {
		if (isHttpError(err)) {
			throw err;
		}

		const message = err instanceof Error ? err.message : 'Failed to send password reset email';

		if (message.includes('user-not-found')) {
			throw error(404, 'User not found');
		}

		throw error(500, message);
	}
};
