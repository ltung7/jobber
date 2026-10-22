/**
 * Validates an International Bank Account Number (IBAN) using the MOD-97-10 checksum algorithm (ISO 7064).
 * Supports both Polish accounts (defaulting to PL if 26 digits are provided) and international IBANs.
 */
export function validateIBAN(input: string): { valid: boolean; formatted: string; error?: string } {
	if (!input) {
		return { valid: false, formatted: '', error: 'Bank account number is required' };
	}

	// Remove all spaces, hyphens, and make uppercase
	let cleaned = input.replace(/[\s\-]/g, '').toUpperCase();

	// If exactly 26 digits, assume Polish national account and prefix with 'PL'
	if (/^\d{26}$/.test(cleaned)) {
		cleaned = `PL${cleaned}`;
	}

	// General format: 2 letters (country code), 2 digits (checksum), followed by up to 30 alphanumeric characters
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) {
		return {
			valid: false,
			formatted: cleaned,
			error: 'Invalid IBAN format. Must start with country code or be 26 digits (Polish account).'
		};
	}

	// Country-specific length checks for common IBAN formats
	const IBAN_LENGTHS: Record<string, number> = {
		PL: 28, // PL + 26 digits
		DE: 22,
		GB: 22,
		FR: 27,
		IT: 27,
		ES: 24,
		NL: 18,
		UA: 29,
		CZ: 24,
		SK: 24,
		LT: 20,
		RO: 24
	};

	const countryCode = cleaned.slice(0, 2);
	const expectedLength = IBAN_LENGTHS[countryCode];
	if (expectedLength && cleaned.length !== expectedLength) {
		return {
			valid: false,
			formatted: cleaned,
			error: `Invalid length for ${countryCode} IBAN. Expected ${expectedLength} characters, got ${cleaned.length}.`
		};
	}

	// Move first 4 characters (Country code + Check digits) to the end
	const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

	// Convert letters to numbers (A=10, B=11, ..., Z=35)
	let numericString = '';
	for (let i = 0; i < rearranged.length; i++) {
		const charCode = rearranged.charCodeAt(i);
		if (charCode >= 65 && charCode <= 90) {
			numericString += (charCode - 55).toString();
		} else {
			numericString += rearranged[i];
		}
	}

	// Perform MOD-97 operation using BigInt for precision
	try {
		const remainder = BigInt(numericString) % 97n;
		if (remainder === 1n) {
			// Format cleanly into groups of 4: e.g. PLXX XXXX XXXX ...
			const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
			return { valid: true, formatted };
		}
		return { valid: false, formatted: cleaned, error: 'IBAN checksum failed (invalid account number).' };
	} catch {
		return { valid: false, formatted: cleaned, error: 'Checksum calculation error.' };
	}
}

/**
 * Checks if a string is a valid IBAN.
 */
export function isValidIBAN(input: string): boolean {
	return validateIBAN(input).valid;
}
