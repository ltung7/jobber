import { env } from '$env/dynamic/private';

export const TRELLO_API_BASE = 'https://api.trello.com/1';

export const getTrelloApiKey = (): string => {
    const key = env.TRELLO_API_KEY || process.env.TRELLO_API_KEY || '7e39cd5519f2f33fda3c0a60f2531bb0';
    if (!key) {
        throw new Error('TRELLO_API_KEY is not configured in environment variables.');
    }
    return key;
};

export const getTrelloToken = (): string => {
    const token = env.TRELLO_TOKEN || process.env.TRELLO_TOKEN || 'ATTA76edc48f7524a1400f2971632e7b144fc385ed88dced1f056aafb34d8a44437123810376';
    if (!token) {
        throw new Error('TRELLO_TOKEN is not configured in environment variables.');
    }
    return token;
};

// Dedicated token for Trello MCP
export const getMcpSecretToken = (): string => {
    return env.TRELLO_MCP_SECRET_TOKEN || process.env.TRELLO_MCP_SECRET_TOKEN || env.MCP_SECRET_TOKEN || process.env.MCP_SECRET_TOKEN || 'fefd98378da236c1990ba71f5612299e6e8083cb65e62a76c8cb15bbfa5c6891';
};

export const getMcpOAuthClientId = (): string => {
    return env.TRELLO_MCP_OAUTH_CLIENT_ID || process.env.TRELLO_MCP_OAUTH_CLIENT_ID || 'finner-trello-card-assignment-mcp';
};

export const getMcpOAuthClientSecret = (): string => {
    return env.TRELLO_MCP_OAUTH_CLIENT_SECRET || process.env.TRELLO_MCP_OAUTH_CLIENT_SECRET || '497156171ee5ad92814a302bb0a3c89ff37b465584171a9f';
};
