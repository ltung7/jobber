import { describe, it, expect } from 'vitest';
import { callBitrixReadOnly, BitrixReadOnlyViolationError, BitrixEntityTypeViolationError } from '$lib/server/mcp/bitrix/client';
import { sanitizeBitrixPayload, sanitizeSelectFields } from '$lib/server/mcp/bitrix/sanitizer';

describe('Bitrix Read-Only MCP Guardrails & Sanitizer', () => {
    it('blocks non-whitelisted mutation methods', async () => {
        await expect(callBitrixReadOnly('crm.item.add', { entityTypeId: 1, fields: { TITLE: 'Test' } }))
            .rejects
            .toThrow(BitrixReadOnlyViolationError);

        await expect(callBitrixReadOnly('crm.lead.update', { id: 1, fields: { TITLE: 'Update' } }))
            .rejects
            .toThrow(BitrixReadOnlyViolationError);
    });

    it('blocks restricted entity types', async () => {
        await expect(callBitrixReadOnly('crm.item.list', { entityTypeId: 4 })) // 4 = Company
            .rejects
            .toThrow(BitrixEntityTypeViolationError);

        await expect(callBitrixReadOnly('crm.item.list', { entityTypeId: 31 })) // 31 = Smart Invoice
            .rejects
            .toThrow(BitrixEntityTypeViolationError);
    });

    it('allows whitelisted read-only methods', async () => {
        // Mocking or live calling crm.category.list which is read-only
        try {
            const res = await callBitrixReadOnly('crm.category.list', { entityTypeId: 2 });
            expect(res).toBeDefined();
        } catch (err: any) {
            // If network fails due to offline/mock, ensure it was not a read-only block
            expect(err.name).not.toBe('BitrixReadOnlyViolationError');
            expect(err.name).not.toBe('BitrixEntityTypeViolationError');
        }
    });

    it('sanitizes RODO sensitive payloads and blacklisted fields', () => {
        const raw = {
            id: 123,
            name: 'John Doe',
            PHOTO: 'https://bitrix.eisg.pl/photo.jpg',
            FILES: [1, 2, 3],
            UF_CRM_1787749544391: 'secret-portal-password',
            nestedObj: {
                showUrl: 'https://bitrix.eisg.pl/show',
                downloadUrl: 'https://bitrix.eisg.pl/download',
                normalField: 'safe'
            }
        };

        const sanitized = sanitizeBitrixPayload(raw);

        expect(sanitized.PHOTO).toBe('[REDACTED_RODO]');
        expect(sanitized.FILES).toBe('[REDACTED_RODO]');
        expect(sanitized.UF_CRM_1787749544391).toBe('[REDACTED_RODO]');
        expect(sanitized.nestedObj).toBe('[REDACTED_FILE_RODO]');
        expect(sanitized.name).toBe('John Doe');
    });

    it('sanitizes select fields array', () => {
        const select = ['ID', 'TITLE', 'PHOTO', 'FILES', 'NAME'];
        const cleaned = sanitizeSelectFields(select);
        expect(cleaned).toEqual(['ID', 'TITLE', 'NAME']);
    });
});
