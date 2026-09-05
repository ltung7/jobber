import { isDev } from '$lib/utils/isDev';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Blocking redirect — server-side, before any HTML is sent
export const load: PageServerLoad = async ({ locals }) => {
	// if (!locals.user && isDev) {
	// 	throw redirect(303, '/login');
	// }

	return { user: locals.user };
};