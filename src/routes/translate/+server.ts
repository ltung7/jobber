import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	checkSecurity,
	makeTranslation,
	makeMultipleTranslations
} from '$lib/server/services/translate.service';

export const POST: RequestHandler = async ({ request, url }) => {
	checkSecurity(request, url);
	
	let body: {
		fields: TranslatableJobInfo;
		targetLang?: Lang | string;
		targetLangs?: Lang[];
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body.');
	}

	const { fields, targetLang, targetLangs } = body;

	if (typeof targetLang === 'string' && targetLang) {
		const translated = await makeTranslation(fields, targetLang);
		return json({ translated });
	}

	if (
		Array.isArray(targetLangs) &&
		targetLangs.length > 0 &&
		targetLangs.every((lang) => typeof lang === 'string')
	) {
		const translated = await makeMultipleTranslations(fields, targetLangs);
		return json({ translated });
	}

	throw error(400, 'Missing or invalid "targetLang" (string) or "targetLangs" (string[]).');
};