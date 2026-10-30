import { describe, it, expect } from 'vitest';
import { TrelloClient } from '$lib/server/mcp/trello/client';
import { createTrelloMcpServer } from '$lib/server/mcp/trello/server';
import {
    ALLOWED_DOMAINS,
    isAllowedEmail,
    createSignedOAuthCode,
    verifySignedOAuthCode,
    createSignedMcpAccessToken,
    verifySignedMcpAccessToken
} from '$lib/server/mcp/trello/auth';
import { getMcpSecretToken } from '$lib/server/mcp/trello/config';

describe('Trello MCP Client & Tools', () => {
    const client = new TrelloClient();

    it('enforces OAuth domain restrictions exclusively to finnergroup.com', () => {
        expect(ALLOWED_DOMAINS).toEqual(['finnergroup.com']);
        expect(isAllowedEmail('tomasz.le@finnergroup.com')).toBe(true);
        expect(isAllowedEmail('someone@eisg.pl')).toBe(false);
        expect(isAllowedEmail('hacker@gmail.com')).toBe(false);
    });

    it('uses dedicated secret key for Trello MCP', () => {
        const token = getMcpSecretToken();
        expect(token).toBe('fefd98378da236c1990ba71f5612299e6e8083cb65e62a76c8cb15bbfa5c6891');
    });

    it('creates and verifies signed OAuth code and access token for finnergroup.com', () => {
        const code = createSignedOAuthCode({
            uid: 'test_uid_123',
            email: 'admin@finnergroup.com',
            redirectUri: 'https://claude.ai/oauth/callback'
        });
        expect(code).toBeDefined();
        expect(code.startsWith('mcp_code_')).toBe(true);

        const verified = verifySignedOAuthCode(code);
        expect(verified).not.toBeNull();
        expect(verified?.email).toBe('admin@finnergroup.com');

        const token = createSignedMcpAccessToken({
            uid: 'test_uid_123',
            email: 'admin@finnergroup.com'
        });
        expect(token.startsWith('mcp_u_')).toBe(true);

        const verifiedToken = verifySignedMcpAccessToken(token);
        expect(verifiedToken?.email).toBe('admin@finnergroup.com');
    });

    it('instantiates TrelloClient with credentials', () => {
        expect(client).toBeDefined();
    });

    it('creates Trello MCP server instance with required tools', () => {
        const server = createTrelloMcpServer();
        expect(server).toBeDefined();
    });

    it('rejects missing or empty cardId', async () => {
        await expect(client.getCard(''))
            .rejects
            .toThrow('Missing cardId / ticketId parameter.');
    });

    it('rejects missing or empty memberId', async () => {
        await expect(client.resolveMember(''))
            .rejects
            .toThrow('Missing memberId / username parameter.');
    });

    it('resolves live member by username from Trello API', async () => {
        const member = await client.resolveMember('@daryavinahrad2');
        expect(member).toBeDefined();
        expect(member.id).toBeDefined();
        expect(typeof member.id).toBe('string');
        expect(member.id.length).toBeGreaterThan(10);
        expect(member.username.toLowerCase()).toContain('daryavinahrad');
    });

    it('fetches live card details by ticketId', async () => {
        const card = await client.getCard('z9NsKqCk');
        expect(card).toBeDefined();
        expect(card.id).toBeDefined();
        expect(card.name).toBeDefined();
        expect(Array.isArray(card.idMembers)).toBe(true);
    });
});
