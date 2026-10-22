import { describe, it, expect } from 'vitest';
import { validateIBAN, isValidIBAN } from '../iban';

describe('validateIBAN', () => {
	it('validates standard Polish 26-digit account without PL prefix', () => {
		// Valid Polish IBAN: PL61 1090 1014 0000 0712 1981 2874
		const res = validateIBAN('61 1090 1014 0000 0712 1981 2874');
		expect(res.valid).toBe(true);
		expect(res.formatted).toBe('PL61 1090 1014 0000 0712 1981 2874');
	});

	it('validates Polish account with PL prefix', () => {
		const res = validateIBAN('PL 61 1090 1014 0000 0712 1981 2874');
		expect(res.valid).toBe(true);
		expect(res.formatted).toBe('PL61 1090 1014 0000 0712 1981 2874');
	});

	it('rejects invalid checksum', () => {
		const res = validateIBAN('PL 61 1090 1014 0000 0712 1981 2875');
		expect(res.valid).toBe(false);
		expect(res.error).toContain('checksum failed');
	});

	it('rejects invalid length', () => {
		const res = validateIBAN('PL 06 1090 2402');
		expect(res.valid).toBe(false);
	});

	it('validates foreign IBAN e.g. German', () => {
		// Valid test German IBAN: DE89 3704 0044 0532 0130 00
		const res = validateIBAN('DE89370400440532013000');
		expect(res.valid).toBe(true);
		expect(isValidIBAN('DE89370400440532013000')).toBe(true);
	});
});
