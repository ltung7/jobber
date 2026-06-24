import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { addAiLog } from '$lib/server/db/tables/ailogs.db';

const ALLOWED_FIELDS = ['workplaceDesc', 'requirements', 'duties', 'extra', 'jobType', 'location', 'housing', 'benefits'] as const;

export const POST: RequestHandler = async ({ request, url }) => {
	// Same-domain guard: Origin or Referer must match the server's host
	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');
	const host = url.host; // e.g. "localhost:5173" or "yourdomain.com"

	const isFromSameDomain =
		(origin && new URL(origin).host === host) ||
		(referer && new URL(referer).host === host);

	if (!isFromSameDomain) {
		throw error(403, 'Forbidden: cross-origin requests are not allowed.');
	}

	let body: { fields: Record<string, string>; targetLang: 'en' | 'pl' };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body.');
	}

	const { fields, targetLang } = body;

	if (!fields || typeof fields !== 'object') {
		throw error(400, 'Missing or invalid "fields" in request body.');
	}

	if (targetLang !== 'en' && targetLang !== 'pl') {
		throw error(400, 'Invalid "targetLang". Must be "en" or "pl".');
	}

	// Strip any keys not in the allowed set
	const sanitizedFields = Object.fromEntries(
		ALLOWED_FIELDS
			.filter((key) => typeof fields[key] === 'string')
			.map((key) => [key, fields[key]])
	);

	if (!Object.values(sanitizedFields).some((v) => v.length > 0)) {
		throw error(400, 'All fields are empty — nothing to translate.');
	}

	const langName = targetLang === 'en' ? 'English' : 'Polish';
	const prompt = `You are a professional HR translator for EISG, a Polish production & logistics outsourcing company. Translate the following job offer fields into ${langName}. Keep professional HR tone. Preserve line breaks. Return ONLY valid JSON with exactly these keys: jobType, location, housing, benefits, workplaceDesc, requirements, duties, extra. Do not add explanation or markdown.\n\nInput JSON:\n${JSON.stringify(sanitizedFields, null, 2)}`;

	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const result = await model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw.replace(/```json|```/g, '').trim();
		const translated = JSON.parse(clean);

        await addAiLog(prompt, translated, result.response.usageMetadata?.totalTokenCount ?? 0, clean.length, 'EISG');

		// Validate that we got the expected keys back
		const missingKeys = ALLOWED_FIELDS.filter((key) => !(key in translated));
		if (missingKeys.length > 0) {
			throw new Error(`Gemini response missing keys: ${missingKeys.join(', ')}`);
		}

		return json({ translated });
	} catch (e) {
		console.error('[/translate] Gemini error:', e);
		throw error(502, 'Translation service failed. Please try again.');
	}
};