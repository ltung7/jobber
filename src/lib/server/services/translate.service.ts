import { error } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';
import { addAiLog } from '$lib/server/db/tables/ailogs.db';
import saveJson from '$lib/utils/saveJson';

export const ALLOWED_FIELDS: Array<keyof TranslatableJobInfo> = [
	'workplaceDesc',
	'requirements',
	'duties',
	'extra',
	'jobType'
] as const;

export type AllowedField = keyof TranslatableJobInfo;
export type TargetLang = 'en' | 'pl';

function tryGetHost(urlString: string): string | null {
	try {
		return new URL(urlString).host;
	} catch {
		return null;
	}
}

/**
 * 1. Security check: verifies that Origin or Referer matches the server's host.
 */
export function checkSecurity(request: Request, url: URL): void;
export function checkSecurity(event: { request: Request; url: URL }): void;
export function checkSecurity(
	requestOrEvent: Request | { request: Request; url: URL },
	maybeUrl?: URL
): void {
	let request: Request;
	let url: URL | undefined;

	if (requestOrEvent instanceof Request) {
		request = requestOrEvent;
		url = maybeUrl;
	} else {
		request = requestOrEvent.request;
		url = requestOrEvent.url;
	}

	if (!url) {
		throw error(400, 'Invalid request URL for security verification.');
	}

	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');
	const host = url.host;

	const originHost = origin ? tryGetHost(origin) : null;
	const refererHost = referer ? tryGetHost(referer) : null;

	const isFromSameDomain = originHost === host || refererHost === host;

	if (!isFromSameDomain) {
		throw error(403, 'Forbidden: cross-origin requests are not allowed.');
	}
}

/**
 * 2. Make actual translations: calls Gemini to translate allowed fields and logs AI usage.
 */
export async function makeTranslation(
	fields: Partial<TranslatableJobInfo>,
	targetLang: Lang | string
): Promise<Partial<TranslatableJobInfo>> {
	if (!fields || typeof fields !== 'object') {
		throw error(400, 'Missing or invalid "fields" in request.');
	}

	if (!targetLang || typeof targetLang !== 'string') {
		throw error(400, 'Missing or invalid "targetLang".');
	}

	// Strip any keys not in the allowed set
	const sanitizedFields = Object.fromEntries(
		ALLOWED_FIELDS
			.filter((key) => typeof fields[key] === 'string')
			.map((key) => [key, fields[key]])
	);

	if (!Object.values(sanitizedFields).some((v) => (v as string).length > 0)) {
		throw error(400, 'All fields are empty — nothing to translate.');
	}

	const langName = targetLang === 'en' ? 'English' : targetLang === 'pl' ? 'Polish' : targetLang;
	const prompt = `You are a professional HR translator for EISG, a Polish production & logistics outsourcing company. Translate the following job offer fields into ${langName}. Keep professional HR tone. Preserve line breaks. Return ONLY valid JSON with exactly these keys: ${ALLOWED_FIELDS.join(', ')}. Do not add explanation or markdown.\n\nInput JSON:\n${JSON.stringify(sanitizedFields, null, 2)}`;

	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const result = await model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw.replace(/```json|```/g, '').trim();
		const translated = JSON.parse(clean);

		await addAiLog(
			prompt,
			translated,
			result.response.usageMetadata?.totalTokenCount ?? 0,
			clean.length,
			'EISG'
		);

		// Validate that we got the expected keys back
		const missingKeys = ALLOWED_FIELDS.filter((key) => !(key in translated));
		if (missingKeys.length > 0) {
			throw new Error(`Gemini response missing keys: ${missingKeys.join(', ')}`);
		}

		return translated;
	} catch (e) {
		console.error('[/translate] Gemini error:', e);
		throw error(502, 'Translation service failed. Please try again.');
	}
}

/**
 * 3. Make multiple translations: translates allowed fields into multiple languages specified by ISO codes.
 * Returns structured result: { [langCode]: { [fieldName]: '...' } }
 */
export async function makeMultipleTranslations(
	fields: Partial<TranslatableJobInfo>,
	targetLangs: Lang[]
): Promise<Record<string, Partial<TranslatableJobInfo>>> {
	if (!fields || typeof fields !== 'object') {
		throw error(400, 'Missing or invalid "fields" in request.');
	}

	const langs = Array.isArray(targetLangs)
		? [...new Set(targetLangs.map((l) => String(l).trim().toLowerCase()).filter(Boolean))]
		: [];

	if (langs.length === 0) {
		throw error(
			400,
			'Missing or invalid "targetLangs" - expected a non-empty array of language codes (e.g. ["pl", "uk"]).'
		);
	}

	// Strip any keys not in the allowed set
	const sanitizedFields = Object.fromEntries(
		ALLOWED_FIELDS
			.filter((key) => typeof fields[key] === 'string')
			.map((key) => [key, fields[key]])
	) as Partial<TranslatableJobInfo>;

	if (!Object.values(sanitizedFields).some((v) => (v as string).length > 0)) {
		throw error(400, 'All fields are empty — nothing to translate.');
	}

	const prompt = `You are a professional HR translator for EISG, a Polish production & logistics outsourcing company. Translate the following job offer fields into each of the target languages specified by their ISO codes: ${langs.join(', ')}. Keep professional HR tone. Preserve line breaks. Return ONLY valid JSON formatted as an object where each top-level key is one of the requested language codes (${langs.join(', ')}), and each value is an object containing exactly these translated keys: ${ALLOWED_FIELDS.join(', ')}. Do not add explanation or markdown.\n\nInput JSON:\n${JSON.stringify(sanitizedFields, null, 2)}`;

	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const result = await model.generateContent(prompt);
		const raw = result.response.text();
		const clean = raw.replace(/```json|```/g, '').trim();
		const translated: Record<string, Partial<TranslatableJobInfo>> = JSON.parse(clean);

		await addAiLog(
			prompt,
			translated,
			result.response.usageMetadata?.totalTokenCount ?? 0,
			clean.length,
			'EISG'
		);

		// Validate that we got an object with all requested language keys
		for (const lang of langs) {
			if (!translated[lang] || typeof translated[lang] !== 'object') {
				throw new Error(`Gemini response missing translation for language code: ${lang}`);
			}
			const missingKeys = ALLOWED_FIELDS.filter((key) => !(key in translated[lang]));
			if (missingKeys.length > 0) {
				throw new Error(`Gemini response for "${lang}" missing keys: ${missingKeys.join(', ')}`);
			}
		}

		return translated;
	} catch (e) {
		console.error('[/translate] Gemini multiple translations error:', e);
		throw error(502, 'Translation service failed. Please try again.');
	}
}
