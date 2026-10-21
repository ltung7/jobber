# Implementation Specification: Bitrix24 Read-Only MCP Server on Google Cloud Run (`bitrix.eisg.pl`)

## 1. Executive Summary & Answers to Initial Questions (Section 4 of Brief)

Before diving into the technical implementation tasks, here is the complete live discovery from `eisg.bitrix24.pl` and the answers to Section 4 of the project brief ("CZEGO POTRZEBUJĘ OD CIEBIE NA START"):

### 1.1. Live Inventory of Custom Fields (`UF_CRM_...`)

#### A. Leads (`CRM_LEAD`, `entityTypeId: 1`)
| Field Code | Label | Type | Key Options / Notes |
| :--- | :--- | :--- | :--- |
| `UF_CRM_LEAD_RECRUITER` | **Recruiter** | `enumeration` | `1194`: Ramod Timilsina, `1282`: Michał, `1196`: N/A |
| `UF_CRM_1788853850535` | **Preferred projects** | `enumeration` | 24 projects (`362`: Animex K3, `364`: Animex K4, `366`: Arvato, `368`: CCC, `370`: Drobex, `372`: Forte, `374`: Gedia, `376`: Granboard, `378`: Hotel, `380`: IMS, `382`: Koral, `384`: Lisner, `386`: Masdrób, `388`: Morpol, `390`: MZP, `392`: Plukon, `394`: Roland, `396`: Roldrob, `398`: RSP, `1224`: Shein, `400`: VidaXL, `402`: Wintech, `404`: Zakrzewscy, `406`: ZARA) |
| `UF_CRM_1792056703212` | **Final project** | `enumeration` | 24 projects (`1232`: Animex K3 ... `1278`: Shein ... `1276`: ZARA) |
| `UF_CRM_1792054637622` | **Contractor company** | `enumeration` | `1220`: EISG, `1222`: BRM |
| `UF_CRM_1784805255043` | **Legal status** | `enumeration` | `52`: Work TRC, `48`: Student TRC, `46`: Family reunification TRC, `44`: PRC, `50`: PESEL UKR (valid), `54`: National visa (type D), `56`: Schengen visa (type C), `358`: Visa-free entry regime, `58`: Application pending, `60`: No card / no visa / expired document, `124`: N/A |
| `UF_CRM_1788347122255` | **Is work permit needed?** | `enumeration` | `338`: Yes, `340`: No |
| `UF_CRM_1789980322` | **Citizenship (list)** | `enumeration` | 31 nationalities (`430`: Nepali, `428`: Indian, `414`: Ukrainian, `460`: Colombian, etc.) |
| `UF_CRM_1784808843171` | **Citizenship** | `string` | Free-text citizenship |
| `UF_CRM_1784808544071` | **Passport number** | `string` | Text only (no file scan) |
| `UF_CRM_1784808962994` | **Job position** | `string` | Free-text job position |
| `UF_CRM_1792058003532` | **Reason for rejection** | `string` | Free-text rejection reason |
| `SOURCE_ID` *(standard)* | **Źródło (Source)** | `crm_status` | `CALL` (Połączenie), `WEB` (Strona internetowa), `ADVERTISING` (Reklama), `PARTNER` (Aktualny klient), `RECOMMENDATION` (Z rekomendacji / Everest Hiring Program), `WEBFORM` (Formularz CRM), `2|FACEBOOK` (Facebook - Otwarty Kanał / Meta), `2|UMNICO_WABA_CLOUD-121389` (UMNICO WhatsApp), `8|ANK_CHATS_APP24_CA_WHATS_APP` (ChatApp WhatsApp), `OTHER` (Inne) |

> **Missing Field Notice (Polecający / Everest Hiring Program):** While `SOURCE_ID = RECOMMENDATION` ("Z rekomendacji") exists, there is currently no dedicated custom field for the **Referrer Name/ID (Polecający - Everest Hiring Program)** on Leads or Contacts. Our provisioning script (`scripts/bitrix-provision-fields.ts`) includes creating `UF_CRM_REFERRER` ("Polecający (Everest Hiring Program)") if desired.

#### B. Deals (`CRM_DEAL`, `entityTypeId: 2`)
| Field Code | Label | Type | Key Options / Notes |
| :--- | :--- | :--- | :--- |
| `UF_CRM_1787822368903` | **Project (Projekt/Klient)** | `enumeration` | 30 projects (`236`: Animex K3, `218`: Animex K4, `354`: Arvato, `220`: Biuro, `238`: CCC, `240`: Drobex, `412`: Drosed, `242`: Forte, `244`: Gedia, `246`: Granboard, `248`: Hotel, `1288`: ID Logistics, `228`: IMS, `250`: Koral, `252`: Lisner, `222`: Masdrób, `254`: Morpol, `256`: MZP, `258`: Plukon, `224`: Rekeep, `260`: Roland, `262`: Roldrob, `264`: RSP, `1202`: Shein, `226`: Specific, `266`: VidaXL, `230`: Wintech, `268`: Zakrzewscy, `270`: ZARA, `410`: MAG Christmas trees) |
| `UF_CRM_DEAL_RECRUITER` | **Recruiter** | `enumeration` | `1198`: Ramod Timilsina, `1286`: Michał, `1200`: N/A |
| `UF_CRM_1790681629518` | **Recruiter (legacy)** | `string` | Deprecated string field |
| `UF_CRM_1787745014165` | **Name** | `string` | Worker first name |
| `UF_CRM_1787745029864` | **Surname** | `string` | Worker surname |
| `UF_CRM_1787746162988` | **Work start** | `date` | Employment start date |
| `UF_CRM_1787746186953` | **Work end** | `date` | Employment end date |
| `UF_CRM_1787751150636` | **TRC validity date** | `date` | Karta pobytu expiration date *(Currently on Deal!)* |
| `UF_CRM_1787821910705` | **WP validity date** | `date` | Zezwolenie na pracę expiration date *(Currently on Deal!)* |
| `UF_CRM_1788854694929` | **WP valid from** | `date` | Work permit valid from date |
| `UF_CRM_1787822064574` | **Passport validity date** | `date` | Passport expiration date *(Currently on Deal!)* |
| `UF_CRM_1787750374620` | **Submission date** | `date` | TRC/WP application submission date |
| `UF_CRM_1787750970305` | **Fingerprints submission date** | `date` | Biometrics date |
| `UF_CRM_1787751096124` | **Decision issue date** | `date` | Urząd decision date |
| `UF_CRM_1787745964885` | **HR agency** | `enumeration` | `1206`: BRM Group, `150`: Qelion, `148`: N/A |
| `UF_CRM_1792400885145` | **WP company** | `enumeration` | `1290`: IMS Sofa, `1292`: Masdrob, `1294`: Rekeep, `1296`: Specific, `1298`: Wintech |

#### C. Contacts (`CRM_CONTACT`, `entityTypeId: 3`)
| Field Code | Label | Type | Key Options / Notes |
| :--- | :--- | :--- | :--- |
| `TYPE_ID` *(standard)* | **Contact Type** | `crm_status` | `UC_I5DEPB`: **Pracownicy**, `CLIENT`: Klienci, `SUPPLIER`: Dostawcy, `PARTNER`: Partnerzy, `OTHER`: Inne |
| `UF_CRM_1790672831151` | **Recruiter** | `enumeration` | `870`: Ramod Timilsina, `1280`: Michał, `1186`: N/A |
| `UF_CRM_6A78301EF323A` | **Legal status** | `enumeration` | `78`: Work TRC, `74`: Student TRC, `72`: Family reunification TRC, `70`: PRC, `76`: PESEL UKR (valid), `80`: National visa (type D), `82`: Schengen visa (type C), `360`: Visa-free entry regime, `84`: Application pending, `86`: No card / no visa / expired document, `122`: N/A |
| `UF_CRM_1788271061980` | **Employer company** | `enumeration` | `304`: EISG SP Z O O, `306`: EISG SP K, `1204`: BRM GROUP, `348`: OUT OF EISG, `350`: N/A |
| `UF_CRM_6ABB729C3312E` | **Preferred projects** | `enumeration` | 24 projects |
| `UF_CRM_6ABB729C89226` | **Citizenship (list)** | `enumeration` | 31 nationalities |
| `UF_CRM_1787747066665` | **PESEL** | `string` | PESEL number |
| `UF_CRM_6A78301F32E5D` | **Passport number** | `string` | Passport number |
| `UF_CRM_1790689375992` | **Agreement validity** | `string` | Text field (not typed as `date`) |

### 1.2. Missing Document Validity Date Fields on Contact (`CRM_CONTACT`) & Provisioning Plan
Currently, **TRC validity date** (`UF_CRM_1787751150636`), **WP validity date** (`UF_CRM_1787821910705`), and **Passport validity date** (`UF_CRM_1787822064574`) exist **only on Deals (`CRM_DEAL`)**, NOT on **Contacts (`CRM_CONTACT`)**, and there is **no Visa validity date** field on Contact either!
Per requirement #4 (*"Jeśli pól z datami ważności dokumentów nie ma, załóż je proszę w kontakcie"*), we will run a one-time provisioning script via `crm.contact.userfield.add` to create 4 `date` fields on Contacts:
1. `UF_CRM_CONTACT_TRC_VALIDITY` — **Data ważności karty pobytu (TRC validity date)** (`USER_TYPE_ID: 'date'`)
2. `UF_CRM_CONTACT_VISA_VALIDITY` — **Data ważności wizy (Visa validity date)** (`USER_TYPE_ID: 'date'`)
3. `UF_CRM_CONTACT_WP_VALIDITY` — **Data ważności zezwolenia na pracę (WP validity date)** (`USER_TYPE_ID: 'date'`)
4. `UF_CRM_CONTACT_PASSPORT_VALIDITY` — **Data ważności paszportu (Passport validity date)** (`USER_TYPE_ID: 'date'`)
5. `UF_CRM_CONTACT_REFERRER` ( & `UF_CRM_LEAD_REFERRER`) — **Polecający (Everest Hiring Program)** (`USER_TYPE_ID: 'string'`)

Furthermore, the `expiring_documents(days)` high-level MCP tool will check **both** the new Contact date fields AND the linked Deal date fields (`UF_CRM_1787751150636` TRC, `UF_CRM_1787821910705` WP, `UF_CRM_1787822064574` Passport) so it works immediately with existing Deal data while the team populates the new Contact fields.

### 1.3. Funnels, Stages & Key Users Discovered
- **Lead Stages (`ENTITY_ID: 'STATUS'`)**:
  - `NEW` -> **New lead**
  - `UC_ESUI05` -> **Contact attempt**
  - `IN_PROCESS` -> **Qualification**
  - `3` -> **Ready to work**
  - `PROCESSED` -> **MAO**
  - `6` -> **Onboarding**
  - `CONVERTED` -> **Onboarded** *(Success)*
  - Failure stages: `JUNK` (Offer rejected), `4` (Contact broken), `5` (Freak), `7` (Spam)
- **Deal Pipelines (`crm.category.list` for `entityTypeId: 2`)**:
  - Category `0`: **Work permit** (`NEW`: Preparing documents, `PREPARATION`: Applied, `PREPAYMENT_INVOICE`: Wezwanie for missing documents, `EXECUTING`: Full submission, `WON`: Positive decision, `LOSE`: Negative decision, `APOLOGY`: Cancelled, `UC_XHUIRO`: Frozen case)
  - Category `2`: **Employment** (`C2:NEW`: Waiting, `C2:PREPARATION`: **Working**, `C2:2`: **Working under different WP**, `C2:PREPAYMENT_INVOICE`: Vacation, `C2:EXECUTING`: **Working-transferring**, `C2:WON`: Deal won, `C2:LOSE`: Resigned, `C2:UC_JK9ZSD`: Transferred to another project, `C2:UC_S0H8WV`: Escaped, `C2:APOLOGY`: Fired by client, `C2:1`: Black list)
  - Category `4`: **TRC/PRC** (`C4:NEW`: Preparing documents, `C4:PREPARATION`: Applied, `C4:PREPAYMENT_INVOICE`: Fingerprints invitation, `C4:EXECUTING`: Fingerprints submitted - in progress, `C4:FINAL_INVOICE`: Wezwanie for missing documents, `C4:UC_DTK9WN`: Full submission, `C4:WON`: Positive decision, `C4:LOSE`: Negative decision, `C4:UC_OEZDDA`: Cancelled TRC, `C4:UC_GY8JXN`: Frozen case, `C4:1`: Resigned from us)
- **Users (`user.get`)**:
  - `ID: 1` — Michał Tlałka (`michal.tlalka@eisg.pl`)
  - `ID: 14` — **Ramod** (`rekrutacja@eisg.pl`)
  - `ID: 16` — **Dhan Karki (DK)** (`dk-karki@eisg.pl`)
  - `ID: 18` — **Darya Vinahrad** (`darya.vinahrad@eisg.pl`)
  - `ID: 26` — Task Manager (`legalizacja@eisg.pl`)

### 1.4. Time & Cost Estimate
- **Implementation Time Estimate:** **12 – 16 hours** (1.5 – 2 working days):
  - Provisioning missing Contact custom fields & Bitrix read-only client with GDPR/RODO sanitizer: **3h**
  - Low-level whitelisted tools (9 Bitrix methods) + High-level aggregation tools (`order_fill`, `funnel_stats`, `expiring_documents`, `overdue_tasks`, `find_contact`): **5h**
  - Firestore `.fdb.ts` audit logging (`bitrixMcpLog.fdb.ts`), Streamable HTTP MCP transport + Auth (Bearer/URL secret token & OAuth 2.0 metadata endpoints for Claude Custom Connector): **3h**
  - Cloud Run containerization, deployment to `eisg-fleet`, and custom domain mapping for `bitrix.eisg.pl`: **2h**
  - End-to-end testing & verification with Claude MCP inspector: **2h**
- **Monthly Infrastructure Cost (Google Cloud Run + Firestore):** **~$0.00 – $2.00 / month**
  - Cloud Run scales to zero (`min-instances: 0`) when idle. Daily morning briefings and ad-hoc check-ins (~1,000–5,000 requests/month) fall 100% within the **Google Cloud Run Always-Free Tier** (2 million requests/month, 360,000 vCPU-sec/month free) and **Firestore Free Tier** (50k reads, 20k writes/day free).
  - Managed SSL certificate for `bitrix.eisg.pl` via Cloud Run Domain Mapping is **$0.00/month**.

---

## 2. Context & Architecture Decisions

### 2.1. Hosting & Deployment Architecture (Google Cloud Run + `bitrix.eisg.pl`)
- **Why Integrated in Repository + Deployed to Cloud Run:**
  - The workspace (`C:\xampp\htdocs\juliette`) is a SvelteKit (`@sveltejs/kit` v2.34, Node 24) project already configured for GCP project `eisg-fleet` with `firebase-admin` (`src/lib/server/db/firebase/firebase.ts`) and Bitrix utilities (`src/lib/bitrix/`).
  - By adding `@modelcontextprotocol/sdk` (Streamable HTTP transport via Web Standard `Request`/`Response` or Node HTTP handler) and exposing the MCP routes under `/mcp` (plus `/mcp/[token]` for URL-token authentication and `/.well-known/oauth-authorization-server` + `/oauth/*` for Claude Custom Connector OAuth compatibility), we can deploy the container directly to **Google Cloud Run** (`service: bitrix-mcp`, region: `europe-central2` Warsaw or `europe-west1` Belgium) and bind it to `https://bitrix.eisg.pl`.
- **Environment Variable Strategy:**
  - Uses `BITRIX24_WEBHOOK_URL` from `.env` (`$env/dynamic/private` or `process.env.BITRIX24_WEBHOOK_URL`), which holds the incoming Bitrix24 webhook with `crm`, `task`, `user` scopes.
  - Uses `MCP_SECRET_TOKEN` (64-character cryptographic hex token) and `MCP_OAUTH_CLIENT_SECRET` in `.env` / Google Cloud Secret Manager.

### 2.2. Strict Read-Only Enforcement & GDPR/RODO Sanitization
1. **Method Whitelist (`READ_ONLY_METHOD_WHITELIST`)**:
   - The Bitrix HTTP client inside the MCP layer enforces a hard, immutable `Set` of allowed Bitrix REST methods:
     - `crm.item.list` (restricted to `entityTypeId` in `[1, 2, 3]`)
     - `crm.item.get` (restricted to `entityTypeId` in `[1, 2, 3]`)
     - `crm.item.fields` (restricted to `entityTypeId` in `[1, 2, 3]`)
     - `crm.category.list`
     - `crm.status.list`
     - `crm.stagehistory.list`
     - `crm.activity.list`
     - `tasks.task.list`
     - `user.get`
   - Any attempt to call a method not in this exact `Set` (e.g., `*.add`, `*.update`, `*.delete`, `*.set`, `batch` containing mutations, `disk.*`, `crm.item.import`) immediately throws `BitrixReadOnlyViolationError` before any network request is made.
2. **RODO / File & Credential Stripping (`sanitizeBitrixPayload`)**:
   - **No Files/Scans:** Strips `FILES`, `WEBDAV_ELEMENTS`, `PHOTO`, `photo`, and any field whose schema type is `file` or `diskfile`, or any object containing `downloadUrl`, `showUrl`, `urlMachine`. In `crm.activity.list`, if `select` is provided by the caller, `FILES` and `STORAGE_ELEMENT_IDS` are forcibly removed from `select`.
   - **No Portal Passwords:** Strips sensitive third-party government portal credentials stored on Deals (`UF_CRM_1787749528909` "Trusted profile login", `UF_CRM_1787749544391` "Trusted profile password", `UF_CRM_1787751004012` "Login", `UF_CRM_1787751012720` "Password") so they are never leaked into LLM context.

### 2.3. Authentication Contract (OAuth 2.0 + Secret URL Token)
Claude Custom Connectors support either **OAuth 2.0** or a **URL with a secret path/query token**:
- **URL Secret Token (Minimum / Immediate):**
  - Endpoint: `https://bitrix.eisg.pl/mcp/<MCP_SECRET_TOKEN>` or `https://bitrix.eisg.pl/mcp?token=<MCP_SECRET_TOKEN>` or `Authorization: Bearer <MCP_SECRET_TOKEN>`.
  - Verified using constant-time comparison (`crypto.timingSafeEqual`).
- **Lightweight OAuth 2.0 Provider for Claude Custom Connector:**
  - `GET /.well-known/oauth-authorization-server` — Returns RFC 8414 OAuth metadata pointing to `https://bitrix.eisg.pl/oauth/authorize` and `https://bitrix.eisg.pl/oauth/token`.
  - `GET /oauth/authorize` & `POST /oauth/token` — Validates admin secret / PKCE challenge and issues a signed JWT / Bearer token (`MCP_SECRET_TOKEN` HMAC) so Claude.ai Web/Desktop can connect via standard OAuth flow or direct URL token.

### 2.4. Audit Logging to Firestore (`bitrixMcpLog.fdb.ts`)
Following the exact pattern in `src/lib/server/db/firebase/template.fdb.ts`:
- Uses `setItem`, `getItemById`, `getItems`, `addItem` from `./firebase`.
- Hierarchy matches `template.fdb.ts`:
  - `mainCollectionName = 'bitrixMcp'`
  - `subCollectionName = 'auditLogs'`
  - `collectionRef = (accountId: string): string => [mainCollectionName, accountId, subCollectionName].join('/')` (where `accountId` identifies the caller/client, e.g., `'claude'` or the authenticated client ID / token fingerprint).
- Every MCP tool call and raw Bitrix query logs:
  - `who` (`accountId`, `clientName`, `ip`, `userAgent`)
  - `what` (`toolName`, `bitrixMethodsCalled`, `params` sanitized, `resultSummary` / `recordCount`, `status`: `'SUCCESS' | 'BLOCKED' | 'ERROR'`)
  - `when` (`createdAt` ISO timestamp, `durationMs`)

---

## 3. Affected Files

### Files to Create:
1. `src/lib/server/db/firebase/bitrixMcpLog.fdb.ts` — Firestore DAO for MCP audit logs based on `template.fdb.ts`.
2. `src/lib/server/mcp/bitrix/config.ts` — Whitelist definitions, RODO blocked fields, stage/funnel/source/recruiter dictionaries, and env loading (`BITRIX24_WEBHOOK_URL`, `MCP_SECRET_TOKEN`).
3. `src/lib/server/mcp/bitrix/sanitizer.ts` — Recursive RODO sanitizer stripping file URLs, attachments, photos, and portal passwords.
4. `src/lib/server/mcp/bitrix/client.ts` — Read-only Bitrix24 REST API client enforcing the method whitelist, `entityTypeId` checks, pagination, and rate-limit retries.
5. `src/lib/server/mcp/bitrix/tools.lowlevel.ts` — MCP tool definitions and handlers for the 9 raw Bitrix methods (`crm_item_list`, `crm_item_get`, `crm_item_fields`, `crm_category_list`, `crm_status_list`, `crm_stagehistory_list`, `crm_activity_list`, `tasks_task_list`, `user_get`).
6. `src/lib/server/mcp/bitrix/tools.highlevel.ts` — MCP tool definitions and handlers for the 5 high-level aggregation tools (`order_fill`, `funnel_stats`, `expiring_documents`, `overdue_tasks`, `find_contact`).
7. `src/lib/server/mcp/bitrix/server.ts` — MCP Server instance factory (`@modelcontextprotocol/sdk`) wiring tools and wrapping every execution with `bitrixMcpLog.fdb.ts` audit logging.
8. `src/lib/server/mcp/bitrix/auth.ts` — Token & OAuth 2.0 verification helper (`verifyMcpRequest`).
9. `src/routes/mcp/+server.ts` — Streamable HTTP MCP endpoint (`POST`, `GET`, `DELETE`, `OPTIONS`) supporting Bearer/query auth.
10. `src/routes/mcp/[token]/+server.ts` — Streamable HTTP MCP endpoint with URL path token (`https://bitrix.eisg.pl/mcp/<MCP_SECRET_TOKEN>`).
11. `src/routes/.well-known/oauth-authorization-server/+server.ts` — OAuth 2.0 Discovery metadata endpoint for Claude Custom Connector.
12. `src/routes/oauth/authorize/+server.ts` — OAuth 2.0 authorization endpoint for Claude Custom Connector.
13. `src/routes/oauth/token/+server.ts` — OAuth 2.0 token exchange endpoint.
14. `scripts/bitrix-provision-fields.ts` — Standalone admin CLI script to create the missing document validity date fields on Bitrix Contacts (`crm.contact.userfield.add`) and verify their IDs.
15. `Dockerfile.mcp` & `cloudbuild.mcp.yaml` — Container and Cloud Build configuration for deploying the MCP service to Google Cloud Run and binding `bitrix.eisg.pl`.
16. `src/lib/server/mcp/bitrix/__tests__/mcp-bitrix.test.ts` — Unit & integration test suite verifying read-only guardrails, RODO sanitization, Firestore logging, and high-level tool calculations.

### Files to Edit:
1. `package.json` — Add `@modelcontextprotocol/sdk` and `zod` dependencies, plus `mcp:provision-fields` and `mcp:deploy` scripts.
2. `.env.example` (or `.env`) — Document `BITRIX24_WEBHOOK_URL`, `MCP_SECRET_TOKEN`, `MCP_OAUTH_CLIENT_ID`, and `MCP_OAUTH_CLIENT_SECRET`.

---

## 4. Detailed Component Specifications

### 4.1. Firestore Audit Logger (`src/lib/server/db/firebase/bitrixMcpLog.fdb.ts`)
Must strictly follow `src/lib/server/db/firebase/template.fdb.ts`:

```typescript
import { setItem, getItemById, getItems, addItem } from "./firebase";

const mainCollectionName: string = 'streamer';
const subCollectionName: string = 'bitrixMcpLogs';

const collectionRef = (accountId: string): string => [ mainCollectionName, accountId, subCollectionName ].join('/');

export interface BitrixMcpAuditLog {
    id?: string;
    accountId: string;           // Who: e.g. 'claude-agent' or client ID
    clientIp: string;            // Who: request IP (x-forwarded-for)
    userAgent: string;           // Who: User-Agent header
    toolName: string;            // What: MCP tool called (e.g. 'funnel_stats', 'crm_item_list')
    bitrixMethods: string[];     // What: Underlying Bitrix REST methods invoked
    params: Record<string, any>; // What: Input arguments
    status: 'SUCCESS' | 'BLOCKED_WRITE_ATTEMPT' | 'UNAUTHORIZED' | 'ERROR';
    recordCount?: number;
    errorMessage?: string;
    durationMs: number;
    createdAt: string;           // When: ISO-8601 timestamp (e.g. new Date().toISOString())
}

export const addBitrixMcpLog = async (accountId: string, data: BitrixMcpAuditLog) => {
    return addItem(data, collectionRef(accountId));
};

export const setBitrixMcpLog = async (accountId: string, id: string, data: Partial<BitrixMcpAuditLog>) => {
    return setItem(id, data, collectionRef(accountId), true);
};

export const getBitrixMcpLog = async <T = BitrixMcpAuditLog>(accountId: string, id: string): Promise<T | null> => {
    return getItemById(id, collectionRef(accountId));
};

export const findBitrixMcpLogs = async <T = BitrixMcpAuditLog>(
    accountId: string,
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionRef(accountId), query, select);
};
```

### 4.2. Read-Only Bitrix Client & RODO Sanitizer (`src/lib/server/mcp/bitrix/client.ts` & `sanitizer.ts`)
- **Configuration (`BITRIX24_WEBHOOK_URL`)**:
  - Reads `env.BITRIX24_WEBHOOK_URL` from `$env/dynamic/private` (falling back to `process.env.BITRIX24_WEBHOOK_URL`).
- **Strict Read-Only Whitelist**:
  ```typescript
  export const ALLOWED_BITRIX_METHODS = new Set([
      'crm.item.list',
      'crm.item.get',
      'crm.item.fields',
      'crm.category.list',
      'crm.status.list',
      'crm.stagehistory.list',
      'crm.activity.list',
      'tasks.task.list',
      'user.get'
  ] as const);

  export const ALLOWED_CRM_ENTITY_TYPES = new Set([1, 2, 3]); // 1=Lead, 2=Deal, 3=Contact
  ```
- **RODO / GDPR Field Blacklist (`BLOCKED_FIELDS`)**:
  - Automatically stripped from `select` arrays and removed from response objects:
    - File/attachment keys: `PHOTO`, `photo`, `FILES`, `files`, `WEBDAV_ELEMENTS`, `webdavElements`, `STORAGE_ELEMENT_IDS`, `storageElementIds`.
    - Portal credentials on Deals: `UF_CRM_1787749528909` (Trusted profile login), `UF_CRM_1787749544391` (Trusted profile password), `UF_CRM_1787751004012` (Login), `UF_CRM_1787751012720` (Password), `ufCrm1787749528909`, `ufCrm1787749544391`, `ufCrm1787751004012`, `ufCrm1787751012720`.
    - Dynamic file detection: Any object value containing `{ showUrl, downloadUrl }` or `{ urlMachine, url }` is replaced with `"[REDACTED_FILE_RODO]"`.

### 4.3. Low-Level Bitrix Tools (`src/lib/server/mcp/bitrix/tools.lowlevel.ts`)
Based on the official Bitrix24 REST API documentation:
1. **`crm_item_list`**:
   - Calls `crm.item.list`.
   - Inputs: `entityTypeId` (`1 | 2 | 3`), `filter` (optional object), `order` (optional object), `select` (optional string array, defaults to `['*', 'UF_*']`), `useOriginalUfNames` (`'Y' | 'N'`, defaults to `'Y'`), `start` (optional number), `fetchAll` (boolean, defaults to `false`, max 500 items per call).
2. **`crm_item_get`**:
   - Calls `crm.item.get`.
   - Inputs: `entityTypeId` (`1 | 2 | 3`), `id` (number), `useOriginalUfNames` (defaults to `'Y'`).
3. **`crm_item_fields`**:
   - Calls `crm.item.fields`.
   - Inputs: `entityTypeId` (`1 | 2 | 3`), `useOriginalUfNames` (defaults to `'Y'`).
   - Returns clean field definitions (stripping file type upload URLs).
4. **`crm_category_list`**:
   - Calls `crm.category.list`.
   - Inputs: `entityTypeId` (`1 | 2 | 3`, defaults to `2` for Deals).
5. **`crm_status_list`**:
   - Calls `crm.status.list`.
   - Inputs: `filter` (optional object, e.g., `{ ENTITY_ID: 'STATUS' }`, `{ ENTITY_ID: 'DEAL_STAGE_2' }`, `{ ENTITY_ID: 'SOURCE' }`), `order` (optional object).
6. **`crm_stagehistory_list`**:
   - Calls `crm.stagehistory.list`.
   - Inputs: `entityTypeId` (`1 | 2`), `filter` (optional object, e.g., `{ OWNER_ID: 123, '>=CREATED_TIME': '2026-01-01' }`), `order` (optional object), `select` (optional string array), `start` (optional number).
7. **`crm_activity_list`**:
   - Calls `crm.activity.list`.
   - Inputs: `filter` (optional object, e.g., `{ OWNER_TYPE_ID: 1, OWNER_ID: 123 }`), `order` (optional object), `select` (optional string array — `FILES` is forcibly excluded for RODO compliance), `start` (optional number).
8. **`tasks_task_list`**:
   - Calls `tasks.task.list`.
   - Inputs: `filter` (optional object, e.g., `{ RESPONSIBLE_ID: 14, '<=DEADLINE': '2026-10-21T23:59:59', '!REAL_STATUS': 5 }`), `order` (optional object), `select` (optional string array), `start` (optional number).
9. **`user_get`**:
   - Calls `user.get`.
   - Inputs: `filter` (optional object, e.g., `{ ACTIVE: true, ID: [14, 16, 18] }`), `sort`, `order`.

### 4.4. High-Level Business Tools (`src/lib/server/mcp/bitrix/tools.highlevel.ts`)

#### 1. `order_fill(projekt)`
- **Purpose:** Counts how many people are at each recruitment/employment stage for a given project/client (specifically highlighting `ONBOARDING`, `ONBOARDED`, `pracuje` / `Working`, plus full stage breakdown).
- **Inputs:** `project` (string — case-insensitive partial or exact match against project name, e.g., `"Shein"`, `"Animex K3"`, `"Plukon"`, or `"all"` for all projects).
- **Execution Logic:**
  1. Resolves the project name against Lead `Preferred projects` (`UF_CRM_1788853850535`), Lead `Final project` (`UF_CRM_1792056703212`), and Deal `Project` (`UF_CRM_1787822368903`).
  2. Queries active Leads matching the project at stages `PROCESSED` (`MAO`), `6` (`Onboarding`), and `CONVERTED` (`Onboarded`).
  3. Queries Deals in the **Employment** pipeline (`categoryId: 2`) and **Work permit** pipeline (`categoryId: 0`) matching `UF_CRM_1787822368903`.
  4. Aggregates counts and lists worker names (`ID`, `Name`, `Stage`, `Work Start Date`, `Recruiter`) grouped by:
     - `onboarding` (Lead stage `6` "Onboarding" + Deal stage `C2:NEW` "Waiting")
     - `onboarded` (Lead stage `CONVERTED` "Onboarded")
     - `working` (Deal stages `C2:PREPARATION` "Working", `C2:2` "Working under different WP", `C2:EXECUTING` "Working-transferring", `C2:PREPAYMENT_INVOICE` "Vacation")
     - `resigned_or_ended` (Deal stages `C2:LOSE` "Resigned", `C2:UC_S0H8WV` "Escaped", `C2:APOLOGY` "Fired by client")
     - Full breakdown by every stage in Leads and Deals.

#### 2. `funnel_stats(od, do, zrodlo)`
- **Purpose:** Calculates how many leads entered in the period `[od, do]` and how many progressed through the canonical funnel:
  `NEW LEAD (NEW)` -> `CONTACT ATTEMPT (UC_ESUI05)` -> `QUALIFICATION (IN_PROCESS)` -> `MAO (PROCESSED)` -> `ONBOARDING (6)` -> `ONBOARDED (CONVERTED)`
  broken down by **Source (`SOURCE_ID`)** (grouped into `Meta` [`2|FACEBOOK`, `ADVERTISING`], `Everest Hiring Program / Polecenia` [`RECOMMENDATION`], `B2B / Partner` [`PARTNER`], `WhatsApp / Umnico` [`2|UMNICO_WABA_CLOUD-121389`, `8|ANK_CHATS_APP24_CA_WHATS_APP`, `8|WASYNCNEXT`], `Web / Form` [`WEB`, `WEBFORM`], `Other`) and by **Recruiter (`UF_CRM_LEAD_RECRUITER` & `ASSIGNED_BY_ID`)**.
- **Inputs:**
  - `from` (`od`: ISO date string `YYYY-MM-DD`)
  - `to` (`do`: ISO date string `YYYY-MM-DD`)
  - `source` (`zrodlo` optional string filter: `'Meta' | 'Polecenia' | 'B2B' | 'all'`, or raw `SOURCE_ID`)
- **Execution Logic:**
  1. Fetches Leads created between `from` and `to` (`crm.item.list` with `entityTypeId: 1`, `filter: { '>=createdTime': from, '<=createdTime': to }`) AND `crm.stagehistory.list` (`entityTypeId: 1`, `filter: { '>=CREATED_TIME': from, '<=CREATED_TIME': to }`).
  2. Since a lead at `MAO` (`PROCESSED`) or `ONBOARDED` (`CONVERTED`) has implicitly passed through earlier stages even if Bitrix skipped intermediate stage history rows, uses **monotonic funnel rank inference + stage history** (plus time-in-stage deltas from `crm.stagehistory.list`).
  3. Outputs:
     - Overall funnel counts & step-by-step conversion percentages (`NEW LEAD` -> `CONTACT ATTEMPT` -> `QUALIFICATION` -> `MAO` -> `ONBOARDING` -> `ONBOARDED`).
     - Breakdown matrix by **Source category** (`Meta`, `Polecenia / Everest Hiring Program`, `B2B`, `WhatsApp`, `Other`).
     - Breakdown matrix by **Recruiter** (`Ramod Timilsina`, `Michał`, `DK / Dhan Karki`, `Darya Vinahrad`, `Unassigned/N/A`).
     - Average time spent on each stage (in hours/days) computed from `crm.stagehistory.list`.

#### 3. `expiring_documents(dni)`
- **Purpose:** Finds Contacts of type **Pracownicy** (`TYPE_ID: 'UC_I5DEPB'`) whose residence card (karta pobytu / TRC), visa (wiza), work permit (zezwolenie na pracę / WP), or passport expires within `X` days (or is already expired).
- **Inputs:**
  - `days` (`dni`: number, default `30`, e.g. `30`, `60`, `90`)
  - `includeAlreadyExpired` (boolean, default `true`)
- **Execution Logic:**
  1. Queries Contacts with `TYPE_ID = 'UC_I5DEPB'` ("Pracownicy") via `crm.item.list` (`entityTypeId: 3`).
  2. Queries associated Deals (`entityTypeId: 2`) to cross-reference existing Deal document expiration dates (`UF_CRM_1787751150636` TRC validity date, `UF_CRM_1787821910705` WP validity date, `UF_CRM_1787822064574` Passport validity date) alongside the newly provisioned Contact date fields (`UF_CRM_CONTACT_TRC_VALIDITY`, `UF_CRM_CONTACT_VISA_VALIDITY`, `UF_CRM_CONTACT_WP_VALIDITY`, `UF_CRM_CONTACT_PASSPORT_VALIDITY`).
  3. Filters for any document date `<= today + days` (and `>= today` if `includeAlreadyExpired === false`).
  4. Returns a sorted list (most urgent first) with: Contact ID, Full Name, Phone, Legal Status, Project, Employer Company, Document Type (`TRC`, `Visa`, `Work Permit`, `Passport`), Expiration Date, and `daysRemaining` (negative if already expired).

#### 4. `overdue_tasks(osoba)`
- **Purpose:** Retrieves overdue tasks (`DEADLINE < now` and status not completed `REAL_STATUS != 5`) grouped by or filtered for a specific person (e.g., `"Ramod"`, `"DK"`, `"Darya"`, `"Michał"`, `"Task Manager"`, or user ID).
- **Inputs:**
  - `person` (`osoba` optional string: name, alias like `"DK"`, or numeric ID; if omitted, returns overdue tasks across all active team members grouped by person).
- **Execution Logic:**
  1. Resolves user alias map (`"ramod" -> 14`, `"dk" | "dhan" | "karki" -> 16`, `"darya" -> 18`, `"michał" | "michal" -> 1`, `"task manager" | "legalizacja" -> 26`) or dynamic lookup via `user.get`.
  2. Calls `tasks.task.list` with filter `{ '<DEADLINE': new Date().toISOString(), '!REAL_STATUS': 5 }` (and `RESPONSIBLE_ID` if `person` specified).
  3. Enriches tasks with `UF_CRM_TASK` bindings (e.g. `L_123` Lead, `D_456` Deal, `C_789` Contact), days overdue, deadline, title, and responsible user name.

#### 5. `find_contact(query)`
- **Purpose:** Fast unified person search across Contacts (`entityTypeId: 3`), Leads (`entityTypeId: 1`), and Deals (`entityTypeId: 2`) by name, surname, or phone number.
- **Inputs:**
  - `query` (`imię/telefon`: string, e.g. `"Gurung"`, `"+48500..."`, `"Ram"`).
- **Execution Logic:**
  1. If `query` contains digits (`>= 5` digits), normalizes phone format and searches `PHONE` via `crm.item.list` filter plus substring matching on phone numbers.
  2. Searches Contacts by `NAME`, `LAST_NAME`, and `UF_CRM_1787824193587` (`Surname!!!`), Deals by `TITLE`, `UF_CRM_1787745014165` (`Name`), `UF_CRM_1787745029864` (`Surname`), and Leads by `TITLE`, `NAME`, `LAST_NAME`.
  3. Returns matching Contacts, linked Deals (with stage, project, TRC/WP validity dates), and Leads, with all file fields stripped per RODO rules.

---

## 5. Google Cloud Run & Subdomain (`bitrix.eisg.pl`) Binding Architecture

### 5.1. Cloud Run Service Configuration
- **GCP Project:** `eisg-fleet` (same project hosting App Engine `manage.eisg.pl` / `jobs.eisg.pl` and Firestore).
- **Service Name:** `bitrix-mcp`
- **Region:** `europe-west1` (Belgium) or `europe-central2` (Warsaw) — note: **Cloud Run Domain Mapping** is natively supported in `europe-west1` (Belgium) and `europe-west4`. Choosing `europe-west1` allows direct 1-command `gcloud beta run domain-mappings create --service bitrix-mcp --domain bitrix.eisg.pl --region europe-west1` with automatic Google-managed SSL certificate!
- **Service Account & Firestore Access:** Uses the default or dedicated service account in `eisg-fleet` with `roles/datastore.user` so `bitrixMcpLog.fdb.ts` writes directly to Firestore with zero extra credential files needed in Cloud Run.

### 5.2. Custom Subdomain Mapping (`bitrix.eisg.pl`)
Because `eisg.pl` is already verified in Google Cloud Console for App Engine:
1. Run:
   ```powershell
   gcloud beta run domain-mappings create --service=bitrix-mcp --domain=bitrix.eisg.pl --region=europe-west1 --project=eisg-fleet
   ```
2. Inspect the DNS record instructions output by GCP:
   ```powershell
   gcloud beta run domain-mappings describe --domain=bitrix.eisg.pl --region=europe-west1 --project=eisg-fleet
   ```
3. In the DNS provider for `eisg.pl`, add the `CNAME` record:
   - **Host/Name:** `bitrix`
   - **Type:** `CNAME`
   - **Value/Target:** `ghs.googlehosted.com.`
4. Google Cloud automatically provisions and renews the managed TLS/SSL certificate for `https://bitrix.eisg.pl`.

---

## 6. Task Checklist

### Phase 1: Dependencies, Environment & Provisioning Script
- [ ] **Task 1.1:** Add `@modelcontextprotocol/sdk` and `zod` to `package.json` dependencies.
- [ ] **Task 1.2:** Update `.env` (and `.env.example`) to ensure `BITRIX24_WEBHOOK_URL`, `MCP_SECRET_TOKEN`, `MCP_OAUTH_CLIENT_ID`, and `MCP_OAUTH_CLIENT_SECRET` are defined.
- [ ] **Task 1.3:** Create `scripts/bitrix-provision-fields.ts` to inspect `crm.contact.userfield.list` and create the missing Contact document expiration date fields via `crm.contact.userfield.add` (`UF_CRM_CONTACT_TRC_VALIDITY`, `UF_CRM_CONTACT_VISA_VALIDITY`, `UF_CRM_CONTACT_WP_VALIDITY`, `UF_CRM_CONTACT_PASSPORT_VALIDITY`, and `UF_CRM_CONTACT_REFERRER`).

### Phase 2: Firestore Audit Logger (`.fdb.ts`)
- [ ] **Task 2.1:** Create `src/lib/server/db/firebase/bitrixMcpLog.fdb.ts` modeled strictly on `src/lib/server/db/firebase/template.fdb.ts` (`setBitrixMcpLog`, `getBitrixMcpLog`, `findBitrixMcpLogs`, `addBitrixMcpLog`) using `collectionRef(accountId)`.

### Phase 3: Read-Only Bitrix Client & RODO Sanitizer
- [ ] **Task 3.1:** Create `src/lib/server/mcp/bitrix/config.ts` containing the immutable `ALLOWED_BITRIX_METHODS` whitelist, `ALLOWED_CRM_ENTITY_TYPES` (`1, 2, 3`), RODO blocked field keys, user aliases (`Ramod=14`, `DK=16`, `Darya=18`, `Michał=1`), and stage/source dictionaries.
- [ ] **Task 3.2:** Create `src/lib/server/mcp/bitrix/sanitizer.ts` with `sanitizeSelectFields(select)` and `sanitizeBitrixPayload(data)` to strip all file objects, scan URLs, `PHOTO`, `FILES`, and portal logins/passwords.
- [ ] **Task 3.3:** Create `src/lib/server/mcp/bitrix/client.ts` implementing `callBitrixReadOnly(method, params)` and `fetchBitrixPaginatedReadOnly(method, params, maxRecords)` using `BITRIX24_WEBHOOK_URL` from `.env`, throwing `BitrixReadOnlyViolationError` on any non-whitelisted method.

### Phase 4: Low-Level & High-Level MCP Tools
- [ ] **Task 4.1:** Create `src/lib/server/mcp/bitrix/tools.lowlevel.ts` registering the 9 whitelisted Bitrix tools (`crm_item_list`, `crm_item_get`, `crm_item_fields`, `crm_category_list`, `crm_status_list`, `crm_stagehistory_list`, `crm_activity_list`, `tasks_task_list`, `user_get`).
- [ ] **Task 4.2:** Create `src/lib/server/mcp/bitrix/tools.highlevel.ts` implementing:
  - `order_fill(project)`
  - `funnel_stats(from, to, source)`
  - `expiring_documents(days, includeAlreadyExpired)`
  - `overdue_tasks(person)`
  - `find_contact(query)`
- [ ] **Task 4.3:** Create `src/lib/server/mcp/bitrix/server.ts` instantiating the `McpServer`, wrapping every tool execution with timing, error catching, RODO output sanitization, and `setBitrixMcpLog` / `addBitrixMcpLog` audit logging to Firestore.

### Phase 5: Streamable HTTP Transport & Auth Endpoints
- [ ] **Task 5.1:** Create `src/lib/server/mcp/bitrix/auth.ts` supporting both URL secret token (`/mcp/<token>` or `?token=<token>`) and `Authorization: Bearer <token>` / OAuth 2.0 JWT verification.
- [ ] **Task 5.2:** Create `src/routes/mcp/+server.ts` and `src/routes/mcp/[token]/+server.ts` implementing the MCP Streamable HTTP transport (`WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`).
- [ ] **Task 5.3:** Create OAuth 2.0 endpoints for Claude Custom Connector (`src/routes/.well-known/oauth-authorization-server/+server.ts`, `src/routes/oauth/authorize/+server.ts`, and `src/routes/oauth/token/+server.ts`).

### Phase 6: Cloud Run Deployment & Subdomain Mapping
- [ ] **Task 6.1:** Create `Dockerfile.mcp` (Node 24 Alpine build running the SvelteKit `@sveltejs/adapter-node` build or standalone MCP server entry) and `cloudbuild.mcp.yaml`.
- [ ] **Task 6.2:** Deploy to Google Cloud Run (`service: bitrix-mcp`, `region: europe-west1`, `project: eisg-fleet`) and map custom domain `bitrix.eisg.pl`.

---

## 7. Verification Criteria

The implementation must pass all of the following automated and manual verification checks:

1. **Unit & Integration Test Suite (Vitest):**
   ```powershell
   npx vitest run src/lib/server/mcp/bitrix/__tests__/mcp-bitrix.test.ts
   ```
   Must verify:
   - **Read-Only Enforcement:** Calling `callBitrixReadOnly('crm.item.add', ...)` or `crm.lead.update` or `crm.deal.delete` throws `BitrixReadOnlyViolationError` and logs `status: 'BLOCKED_WRITE_ATTEMPT'` to `bitrixMcpLog.fdb.ts`.
   - **Entity Type Restriction:** Calling `crm_item_list` with `entityTypeId: 4` (Company) or `31` (Invoice) is rejected.
   - **RODO Sanitizer:** Payloads containing `PHOTO`, `FILES`, `downloadUrl`, `UF_CRM_1787749544391` (Trusted profile password) have those fields stripped before returning to the MCP caller.
   - **Firestore Audit Logging:** Every tool execution calls `setBitrixMcpLog` / `addBitrixMcpLog` with `accountId`, `toolName`, `bitrixMethods`, `params`, `durationMs`, and `createdAt`.
   - **High-Level Tools:** `order_fill`, `funnel_stats`, `expiring_documents`, `overdue_tasks`, and `find_contact` return valid structured JSON matching live Bitrix24 schemas.

2. **TypeScript & SvelteKit Type Check:**
   ```powershell
   npm run check
   ```

3. **Provisioning Verification (Contact Custom Fields):**
   ```powershell
   npx tsx scripts/bitrix-provision-fields.ts --dry-run
   npx tsx scripts/bitrix-provision-fields.ts --apply
   ```
   Verify via `crm.item.fields` (`entityTypeId: 3`) that the Contact validity date fields exist and are of type `date`.

4. **Streamable HTTP MCP Handshake & Tool Call Smoke Test:**
   ```powershell
   curl -i -X POST "https://bitrix.eisg.pl/mcp/$env:MCP_SECRET_TOKEN" `
     -H "Content-Type: application/json" `
     -H "Accept: application/json, text/event-stream" `
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"claude-test","version":"1.0.0"}}}'
   ```
