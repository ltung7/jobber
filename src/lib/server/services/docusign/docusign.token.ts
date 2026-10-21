import { env } from '$env/dynamic/private';
import docusign from "docusign-esign";
import { decrypt } from '../../secure/encrypt';

const ENCRYPTED = "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$kBqrVmmovdfNZ5THEf8qeQ==";
const REST_BASE_PATH = "https://demo.docusign.net/restapi"; // development/demo API server

const {
    DS_CLIENT_ID,      // Integration Key
    DS_USER_ID,        // API Username (GUID) — the impersonated user
    DS_ACCOUNT_ID,      // API Account ID
} = env as Record<string, string>;
const OAUTH_BASE_PATH = "account-d.docusign.com";      // development/demo auth server
const SCOPES = [ "signature", "impersonation" ];
const TOKEN_TTL_SECONDS = 3600; // 1 hour

// --- Token cache (module-level singleton, reused while valid) ---
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getDocusignAccessToken(): Promise<string> {
    const now = Date.now();

    // 60s safety buffer before expiry
    if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
        return cachedToken.accessToken;
    }

    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath(OAUTH_BASE_PATH);

    const privateKey = Buffer.from([ '-----BEGIN RSA PRIVATE KEY-----\n', '\n-----END RSA PRIVATE KEY-----' ].join(decrypt(ENCRYPTED)));

    const results = await apiClient.requestJWTUserToken(
        DS_CLIENT_ID,
        DS_USER_ID,
        SCOPES,
        privateKey,
        TOKEN_TTL_SECONDS
    );

    const accessToken = results.body.access_token;
    cachedToken = {
        accessToken,
        expiresAt: now + TOKEN_TTL_SECONDS * 1000,
    };

    return accessToken;
}

export async function getDocusignApi() {
    const accessToken = await getDocusignAccessToken();

    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(REST_BASE_PATH);
    apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    return { envelopesApi, accountId: DS_ACCOUNT_ID }
}