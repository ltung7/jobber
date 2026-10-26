import { describe, it, expect } from 'vitest';
import { callBitrixReadOnly, BitrixReadOnlyViolationError, BitrixEntityTypeViolationError } from '$lib/server/mcp/bitrix/client';
import { sanitizeBitrixPayload, sanitizeSelectFields } from '$lib/server/mcp/bitrix/sanitizer';
import {
    isAllowedEmail,
    createSignedOAuthCode,
    verifySignedOAuthCode,
    createSignedMcpAccessToken,
    verifySignedMcpAccessToken,
    verifyPkce,
    verifyMcpRequest
} from '$lib/server/mcp/bitrix/auth';
import { getMcpSecretToken, ALLOWED_CRM_ENTITY_TYPES } from '$lib/server/mcp/bitrix/config';
import crypto from 'crypto';

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

    it('allows Quotes (7) and still blocks unsupported/unscoped types', async () => {
        expect(ALLOWED_CRM_ENTITY_TYPES.has(7)).toBe(true);
        for (const id of [4, 5, 8, 31, 36, 39]) {
            expect(ALLOWED_CRM_ENTITY_TYPES.has(id)).toBe(false);
        }

        // entity type is rejected before any network call, for every scoped method
        await expect(callBitrixReadOnly('crm.item.fields', { entityTypeId: 5 }))
            .rejects
            .toThrow(BitrixEntityTypeViolationError);
        await expect(callBitrixReadOnly('crm.stagehistory.list', { entityTypeId: 4 }))
            .rejects
            .toThrow(BitrixEntityTypeViolationError);
        await expect(callBitrixReadOnly('crm.category.list', { entityTypeId: 31 }))
            .rejects
            .toThrow(BitrixEntityTypeViolationError);

        // missing entityTypeId must not silently pass through
        await expect(callBitrixReadOnly('crm.item.list', {}))
            .rejects
            .toThrow(BitrixEntityTypeViolationError);
    });

    it('crm.item.list returns item objects even if useOriginalUfNames is passed', async () => {
        const res: any = await callBitrixReadOnly('crm.item.list', {
            entityTypeId: 7,
            select: ['id', 'title'],
            start: 0,
            useOriginalUfNames: 'Y'
        });
        const items = res.result?.items ?? [];
        expect(items.length).toBeGreaterThan(0);
        expect(Array.isArray(items[0])).toBe(false);
        expect(items[0]).toHaveProperty('id');
    });

    it('allows whitelisted read-only methods', async () => {
        try {
            const res = await callBitrixReadOnly('crm.category.list', { entityTypeId: 2 });
            expect(res).toBeDefined();
        } catch (err: any) {
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

describe('Firebase & Google OAuth2 Authentication Guardrails', () => {
    it('restricts emails strictly to @eisg.pl and @finnergroup.com', () => {
        expect(isAllowedEmail('michal@eisg.pl')).toBe(true);
        expect(isAllowedEmail('admin@finnergroup.com')).toBe(true);
        expect(isAllowedEmail('RAMOD@EISG.PL')).toBe(true);

        expect(isAllowedEmail('attacker@gmail.com')).toBe(false);
        expect(isAllowedEmail('user@fake-eisg.pl')).toBe(false);
        expect(isAllowedEmail('invalid-email')).toBe(false);
        expect(isAllowedEmail('')).toBe(false);
    });

    it('creates and verifies HMAC-signed OAuth authorization codes', () => {
        const code = createSignedOAuthCode({
            uid: 'firebase_user_123',
            email: 'michal@eisg.pl',
            redirectUri: 'https://claude.ai/api/oauth/callback',
            codeChallenge: 'test-challenge',
            codeChallengeMethod: 'S256'
        });

        expect(code.startsWith('mcp_code_')).toBe(true);

        const decoded = verifySignedOAuthCode(code);
        expect(decoded).not.toBeNull();
        expect(decoded?.uid).toBe('firebase_user_123');
        expect(decoded?.email).toBe('michal@eisg.pl');
        expect(decoded?.redirectUri).toBe('https://claude.ai/api/oauth/callback');
        expect(decoded?.codeChallenge).toBe('test-challenge');
        expect(decoded?.codeChallengeMethod).toBe('S256');

        // Tampering check (tampered signature and tampered payload)
        const tamperedSig = code.slice(0, -6) + 'abcdef';
        expect(verifySignedOAuthCode(tamperedSig)).toBeNull();

        const tamperedPayload = code.replace('mcp_code_ey', 'mcp_code_ex');
        expect(verifySignedOAuthCode(tamperedPayload)).toBeNull();

        // Expired code check
        const expiredCode = createSignedOAuthCode({
            uid: 'expired_user',
            email: 'michal@eisg.pl',
            redirectUri: 'https://claude.ai/api/oauth/callback',
            exp: Date.now() - 1000 // already expired
        });
        expect(verifySignedOAuthCode(expiredCode)).toBeNull();
    });

    it('verifies PKCE code_challenge with S256 and plain methods', () => {
        const verifier = 'random-verifier-string-1234567890';
        const challengeS256 = crypto.createHash('sha256').update(verifier).digest()
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        expect(verifyPkce(verifier, challengeS256, 'S256')).toBe(true);
        expect(verifyPkce('wrong-verifier', challengeS256, 'S256')).toBe(false);

        expect(verifyPkce('plain-secret', 'plain-secret', 'plain')).toBe(true);
        expect(verifyPkce('plain-wrong', 'plain-secret', 'plain')).toBe(false);
    });

    it('creates and verifies HMAC-signed MCP user access tokens', () => {
        const userToken = createSignedMcpAccessToken({
            uid: 'uid_eisg_001',
            email: 'recruitment@eisg.pl'
        });

        expect(userToken.startsWith('mcp_u_')).toBe(true);

        const payload = verifySignedMcpAccessToken(userToken);
        expect(payload).not.toBeNull();
        expect(payload?.email).toBe('recruitment@eisg.pl');
        expect(payload?.uid).toBe('uid_eisg_001');

        // Verify request with Bearer userToken
        const reqWithUserToken = new Request('https://bitrix.eisg.pl/mcp', {
            headers: {
                Authorization: `Bearer ${userToken}`,
                'User-Agent': 'claude-desktop'
            }
        });

        const authResult = verifyMcpRequest(reqWithUserToken);
        expect(authResult.authenticated).toBe(true);
        expect(authResult.accountId).toBe('recruitment@eisg.pl');
        expect(authResult.email).toBe('recruitment@eisg.pl');

        // Verify request with static secret token
        const staticSecret = getMcpSecretToken();
        const reqWithStaticToken = new Request('https://bitrix.eisg.pl/mcp', {
            headers: {
                Authorization: `Bearer ${staticSecret}`
            }
        });
        const staticAuth = verifyMcpRequest(reqWithStaticToken);
        expect(staticAuth.authenticated).toBe(true);
        expect(staticAuth.accountId).toBe('token-client');

        // Verify rejection of unauthenticated / forged token
        const reqForged = new Request('https://bitrix.eisg.pl/mcp', {
            headers: {
                Authorization: 'Bearer invalid_fake_token'
            }
        });
        const forgedAuth = verifyMcpRequest(reqForged);
        expect(forgedAuth.authenticated).toBe(false);
    });
});
