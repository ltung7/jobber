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

#### D. Quotes (`CRM_QUOTE`, `entityTypeId: 7`) — enabled read-only
Live check: **517 quotes**, 49 fields, only 4 custom fields, **no file/disk fields** (`FILES` absent; `storageElementIds` exists and is already in `BLOCKED_FIELD_KEYS`). Client PII (`clientEmail`, `clientPhone`, `clientContact`) and commercial fields (`opportunity`, `taxValue`, `content`, `terms`) are readable; worker documents are not stored here.

| Field Code | Label | Type | Notes |
| :--- | :--- | :--- | :--- |
| `UF_CRM_QUOTE_1788164881639` | **Valid from** | `date` | Quote validity start |
| `UF_CRM_QUOTE_1788165144700` | **Pracodawca-użytkownik** | `enumeration` | Employer-user |
| `UF_CRM_QUOTE_1788166776338` | **18 month period end** | `date` | Legalization 18-month horizon |
| `UF_CRM_QUOTE_1788172213716` | **Document type** | `enumeration` | Document type |

> `crm.category.list` / `crm.stagehistory.list` **do not support quotes** (`Nieobsługiwany obiekt CRM „Oferta”`), so funnels for `entityTypeId: 7` must come from `stageId` values on the items themselves (currently `DRAFT`).

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

### 2.1. Hosting & Deployment Architecture (Minimal Standalone MCP Runner on Google Cloud Run `europe-west1` + `bitrix.eisg.pl`)
- **Why Minimal Standalone Runner (Not the Whole SvelteKit Project):**
  - Instead of building or shipping the entire SvelteKit web application into the Cloud Run container, we use a dedicated **minimal standalone MCP runner** (`src/mcp-runner.ts`) compiled via `esbuild` (`scripts/build-mcp-runner.mjs`) into a single **~38 KB ESM bundle (`dist-mcp/server.mjs`)**.
  - `Dockerfile.mcp` copies **only** `src/mcp-runner.ts`, `src/lib/server/mcp/bitrix/*`, and the Firestore audit logger (`src/lib/server/db/firebase/bitrixMcpLog.fdb.ts` + `firebase.ts`). It does **not** copy `src/routes`, `src/components`, `static`, or run `vite build`.
  - The production container installs **only 4 runtime dependencies** (`@modelcontextprotocol/sdk`, `axios`, `firebase-admin`, `zod`) and exposes **only** the MCP & OAuth endpoints (`/mcp`, `/mcp/:token`, `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, and `/health`).
  - Deployed to **Google Cloud Run** (`service: bitrix-mcp`, region: **`europe-west1`** — see §5.1; the plan originally targeted `europe-central2`, but the live service, image registry and Cloud Build config all run in `europe-west1`) in GCP project `eisg-fleet` and bound to `https://bitrix.eisg.pl`.
- **Environment Variable Strategy:**
  - Uses `BITRIX24_WEBHOOK_URL` from `.env` (`process.env.BITRIX24_WEBHOOK_URL`), which holds the incoming Bitrix24 webhook with `crm`, `task`, `user` scopes (`task` is a separate scope and easy to miss — see §2.5 and Step 0 in §8.1).
  - Uses `MCP_SECRET_TOKEN` (64-character cryptographic hex token) and `MCP_OAUTH_CLIENT_SECRET` in `.env` / Google Cloud Run environment variables.

### 2.2. Strict Read-Only Enforcement & GDPR/RODO Sanitization
1. **Method Whitelist (`READ_ONLY_METHOD_WHITELIST`)**:
   - The Bitrix HTTP client inside the MCP layer enforces a hard, immutable `Set` of allowed Bitrix REST methods:
     - `crm.item.list` (restricted to `entityTypeId` in `[1, 2, 3, 7]`)
     - `crm.item.get` (restricted to `entityTypeId` in `[1, 2, 3, 7]`)
     - `crm.item.fields` (restricted to `entityTypeId` in `[1, 2, 3, 7]`)
     - `crm.category.list` (restricted to `entityTypeId` in `[1, 2, 3, 7]`)
     - `crm.status.list`
     - `crm.stagehistory.list` (restricted to `entityTypeId` in `[1, 2, 3, 7]`)
     - `crm.activity.list`
     - `tasks.task.list`
     - `user.get`
   - **Entity-type allowlist** (`1` Lead, `2` Deal, `3` Contact, `7` Quote) applies to every entity-scoped method (`crm.item.*`, `crm.category.list`, `crm.stagehistory.list`). Companies (`4`), invoices (`5`, `31`), requisites (`8`), documents (`36`, `39`) and SPAs (`>= 128`) stay blocked because `BLOCKED_FIELD_KEYS` does not cover bank accounts, requisites or legal-document content; `5` and `8` are additionally unsupported by `crm.item.*`. A missing `entityTypeId` is rejected rather than forwarded.
   - Any attempt to call a method not in this exact `Set` (e.g., `*.add`, `*.update`, `*.delete`, `*.set`, `batch` containing mutations, `disk.*`, `crm.item.import`) immediately throws `BitrixReadOnlyViolationError` before any network request is made.
2. **RODO / File & Credential Stripping (`sanitizeBitrixPayload`)**:
   - **No Files/Scans:** Strips `FILES`, `WEBDAV_ELEMENTS`, `PHOTO`, `photo`, and any field whose schema type is `file` or `diskfile`, or any object containing `downloadUrl`, `showUrl`, `urlMachine`. In `crm.activity.list`, if `select` is provided by the caller, `FILES` and `STORAGE_ELEMENT_IDS` are forcibly removed from `select`.
   - **No Portal Passwords:** Strips sensitive third-party government portal credentials stored on Deals (`UF_CRM_1787749528909` "Trusted profile login", `UF_CRM_1787749544391` "Trusted profile password", `UF_CRM_1787751004012` "Login", `UF_CRM_1787751012720` "Password") so they are never leaked into LLM context.

### 2.3. Authentication Contract (Firebase Authentication / Google OAuth 2.0 + Secret URL Token)
Because the `eisg-fleet` project already has **Firebase Authentication** enabled with both **Google Sign-In (`GoogleAuthProvider`)** and **Email/Password (`signInWithEmailAndPassword`)** — and `firebase-admin` is already bundled inside the minimal Cloud Run container — we use **Firebase Authentication as our OAuth 2.0 Identity Provider** instead of an unverified email form or separate Google Cloud OAuth credentials:

1. **Why Firebase Authentication + Google OAuth2 is Superior & Zero-Config:**
   - Reuses the existing `eisg-fleet` Firebase project (`PUBLIC_FIREBASE_APIKEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN=eisg-fleet.firebaseapp.com`).
   - Supports **both** "Sign in with Google" (Google Workspace `@eisg.pl` / `@finnergroup.com` accounts) **and** existing Firebase Email + Password accounts from `manage.eisg.pl`.
   - Cryptographically verifies the user's real identity on the server via `admin.auth().verifyIdToken(idToken, true)` — eliminating any possibility of typing a fake or unverified email address.
   - Embeds the verified `email` and `uid` into the signed OAuth Bearer token so every Firestore audit log in `bitrixMcpLog.fdb.ts` records the exact authenticated user (`accountId: decoded.email`).

2. **OAuth 2.0 Flow for Claude.ai Web / Desktop Custom Connector:**
   - `GET /.well-known/oauth-authorization-server` — Returns RFC 8414 OAuth metadata (`authorization_endpoint: https://bitrix.eisg.pl/oauth/authorize`, `token_endpoint: https://bitrix.eisg.pl/oauth/token`, `code_challenge_methods_supported: ['S256', 'plain']`).
   - `GET /oauth/authorize` — Serves a login page powered by the official Firebase Auth Web SDK (`signInWithPopup` for Google OAuth2 + `signInWithEmailAndPassword` for Firebase Email/Password). Once the user authenticates with Google or Firebase, the page obtains the Firebase `idToken` and submits it via `POST /oauth/authorize`.
   - `POST /oauth/authorize` — Calls `admin.auth().verifyIdToken(idToken, true)` via `firebase-admin`, enforces that `decoded.email` belongs to `ALLOWED_DOMAINS` (`['eisg.pl', 'finnergroup.com']`), and generates a short-lived (5-minute), HMAC-SHA256-signed authorization `code` binding `{ uid, email, exp, codeChallenge, codeChallengeMethod, redirectUri }`.
   - `POST /oauth/token` — Verifies the HMAC-signed `code`, validates PKCE `code_verifier` (when `code_challenge` was supplied) and optional `MCP_OAUTH_CLIENT_ID` / `MCP_OAUTH_CLIENT_SECRET`, and returns an HMAC-signed Bearer token (`mcp_u_<base64url(payload)>.<hmac>`) containing the verified `email` and `uid`.

3. **URL Secret Token (For CLI / Claude Code / OpenCode):**
   - Endpoint: `https://bitrix.eisg.pl/mcp/<MCP_SECRET_TOKEN>` or `https://bitrix.eisg.pl/mcp?token=<MCP_SECRET_TOKEN>` or `Authorization: Bearer <MCP_SECRET_TOKEN>`.
   - Verified using constant-time comparison (`crypto.timingSafeEqual`).

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

### 2.5. Live Findings: Task Reading & Webhook Scopes (2026-10-29)
Production testing showed that **tasks were unreadable** even though the MCP tool was correctly registered and whitelisted. Root cause and hardening (all verified live against `https://bitrix.eisg.pl` and the raw webhook):

1. **Root cause — missing `task` scope on the incoming webhook.**
   - `tasks.task.list`, `tasks.task.get` and `task.commentitem.getlist` returned HTTP `401` with `{"error":"insufficient_scope","error_description":"The request requires higher privileges than provided by the webhook token"}`, while `crm.*`, `user.get` and `profile` returned `200`.
   - The webhook `https://eisg.bitrix24.pl/rest/1/o0a54hervvwqx6tk/` (owner: Michał Tlałka, ID `1`, admin) was created with `crm` + `user` only. **`task` is a separate scope** and must be ticked explicitly in *Developer resources → Other → Incoming webhook → edit*.
   - Resolution: the scope was added by the portal admin; no token/URL or `.env`/Cloud Run change was needed, and no redeploy was required. `tasks.task.list` → `200`, `tasks.task.get` → `200`.
2. **Two client bugs found while diagnosing (fixed and deployed in revision `bitrix-mcp-00005-x8g`):**
   - **Lost error detail:** axios throws on non-2xx *before* the `data.error` branch runs, so every failure surfaced as `Request failed with status code 401`. `callBitrixReadOnly` now reads `err.response.data` and throws `Bitrix REST Error [insufficient_scope]: … — the incoming webhook used by BITRIX24_WEBHOOK_URL lacks the required scope …`. This makes scope/permission problems self-diagnosing.
   - **Wrong response shape for tasks:** `fetchBitrixPaginatedReadOnly` only understood `result.items` / `result[]`, but `tasks.task.list` returns `{ result: { tasks: [...] } }`, so it collapsed the whole page into a single bogus record. `result.tasks` is now handled.
3. **Defensive fallback in `overdue_tasks`.** When `tasks.task.list` is scope-blocked (401 / `insufficient_scope`), the tool falls back to `crm.activity.list` with `filter: { PROVIDER_ID: 'CRM_TASKS_TASK', COMPLETED: 'N', '<DEADLINE': <now> }`, which is covered by the `crm` scope and returns CRM-bound tasks with `SUBJECT`, `DEADLINE`, `RESPONSIBLE_ID`, `COMPLETED`, `ASSOCIATED_ENTITY_ID` (task ID) and `OWNER_TYPE_ID`/`OWNER_ID` (Lead/Deal/Contact/Quote). The response then carries `source: "crm.activity.list"` plus a `warning` explaining the limitation (non-CRM tasks are not included). With the scope granted, the tool uses `source: "tasks.task.list"` and the fallback stays dormant.
4. **Live verification after the scope fix:** `overdue_tasks({person:"DK"})` → `source: "tasks.task.list"`, 6 tasks (sample: `{ id: "1370", daysOverdue: 7, crmBindings: ["L_418"], responsibleName: "Dhan Karki" }`); `overdue_tasks({})` → 59 overdue tasks (Ramod 49, DK 6, Michał 2, Darya 1) versus 58 via the CRM-only fallback, confirming non-CRM tasks are now visible.
5. **Open RODO nit (accepted, not fixed):** `tasks.task.list` returns `responsible.icon` / `responsible.link` (avatar and profile URLs) as plain strings, which the current sanitizer does not redact. Tracked as a follow-up; it does not affect CRM payloads.

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
15. `src/mcp-runner.ts` & `scripts/build-mcp-runner.mjs` — Minimal standalone Node HTTP server entry point and `esbuild` bundler producing a 38 KB standalone `dist-mcp/server.mjs` with only 4 runtime dependencies (excluding the rest of the SvelteKit app).
16. `Dockerfile.mcp` & `cloudbuild.mcp.yaml` — Minimal container and Cloud Build configuration for deploying `dist-mcp/server.mjs` to Google Cloud Run (`europe-west1`, see §5.1) and binding `bitrix.eisg.pl`.
17. `src/lib/server/mcp/bitrix/__tests__/mcp-bitrix.test.ts` — Unit & integration test suite verifying read-only guardrails, RODO sanitization, Firestore logging, and high-level tool calculations.

### Files to Edit:
1. `package.json` — Add `@modelcontextprotocol/sdk` and `zod` dependencies, plus `mcp:provision-fields` and `mcp:deploy` scripts.
2. `.env.example` (or `.env`) — Document `BITRIX24_WEBHOOK_URL`, `MCP_SECRET_TOKEN`, `MCP_OAUTH_CLIENT_ID`, and `MCP_OAUTH_CLIENT_SECRET`.
3. `src/lib/server/mcp/bitrix/client.ts` *(2026-10-29)* — Bitrix error surfacing (`insufficient_scope` + scope hint) and `result.tasks` pagination support (see §2.5, Task 3.4).
4. `src/lib/server/mcp/bitrix/tools.highlevel.ts` *(2026-10-29)* — `overdue_tasks` scope fallback via `crm.activity.list`, unified normalization, `responsibleName` enrichment, `source` / `warning` in the response (see §2.5, Task 4.4).

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

  export const ALLOWED_CRM_ENTITY_TYPES = new Set([1, 2, 3, 7]); // 1=Lead, 2=Deal, 3=Contact, 7=Quote
  ```
- **RODO / GDPR Field Blacklist (`BLOCKED_FIELDS`)**:
  - Automatically stripped from `select` arrays and removed from response objects:
    - File/attachment keys: `PHOTO`, `photo`, `FILES`, `files`, `WEBDAV_ELEMENTS`, `webdavElements`, `STORAGE_ELEMENT_IDS`, `storageElementIds`.
    - Portal credentials on Deals: `UF_CRM_1787749528909` (Trusted profile login), `UF_CRM_1787749544391` (Trusted profile password), `UF_CRM_1787751004012` (Login), `UF_CRM_1787751012720` (Password), `ufCrm1787749528909`, `ufCrm1787749544391`, `ufCrm1787751004012`, `ufCrm1787751012720`.
    - Dynamic file detection: Any object value containing `{ showUrl, downloadUrl }` or `{ urlMachine, url }` is replaced with `"[REDACTED_FILE_RODO]"`.
- **Error Surfacing (live fix 2026-10-29)**: Axios throws on non-2xx responses, so the `data.error` branch never runs on HTTP failures. `callBitrixReadOnly` now reads `err.response.data` and rethrows `Bitrix REST Error [<error>]: <error_description>`, appending a webhook-scope hint for `insufficient_scope`. Without this, every permission problem looked like a generic `status code 401`.
- **Pagination Shapes (live fix 2026-10-29)**: `fetchBitrixPaginatedReadOnly` understands `result[]`, `result.items`, and `result.tasks` (`tasks.task.list` wraps its page in `{ result: { tasks: [...] } }`; missing that key collapsed the entire page into one bogus record).

### 4.3. Low-Level Bitrix Tools (`src/lib/server/mcp/bitrix/tools.lowlevel.ts`)
Based on the official Bitrix24 REST API documentation:
1. **`crm_item_list`**:
   - Calls `crm.item.list`.
   - Inputs: `entityTypeId` (`1 | 2 | 3 | 7`), `filter` (optional object), `order` (optional object), `select` (optional string array, defaults to `['*', 'UF_*']`), `start` (optional number), `fetchAll` (boolean, defaults to `false`, max 500 items per call).
   - **Do not send `useOriginalUfNames`**: on `crm.item.list` this legacy flag makes Bitrix return every item as an empty array `[]` (verified live 2026-10-22). The tool no longer exposes it and `callBitrixReadOnly` strips it defensively.
2. **`crm_item_get`**:
   - Calls `crm.item.get`.
   - Inputs: `entityTypeId` (`1 | 2 | 3 | 7`), `id` (number), `useOriginalUfNames` (defaults to `'Y'`).
3. **`crm_item_fields`**:
   - Calls `crm.item.fields`.
   - Inputs: `entityTypeId` (`1 | 2 | 3 | 7`), `useOriginalUfNames` (defaults to `'Y'`).
   - Returns clean field definitions (stripping file type upload URLs).
4. **`crm_category_list`**:
   - Calls `crm.category.list`.
   - Inputs: `entityTypeId` (`1 | 2 | 3 | 7`, defaults to `2` for Deals).
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
   - **Response shape:** `{ "result": { "tasks": [ { "id", "title", "deadline", "responsibleId", "status", "ufCrmTask", ... } ] } }` — camelCase fields, task page nested under `result.tasks`.
   - **Webhook scope:** requires the `task` scope on `BITRIX24_WEBHOOK_URL`; otherwise Bitrix answers `401 insufficient_scope` (see §2.5). The tool passes that error through verbatim instead of masking it.
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
  3. **Scope fallback (added 2026-10-29):** if `tasks.task.list` fails with `401` / `insufficient_scope` (webhook without the `task` scope), it retries via `crm.activity.list` with `filter: { PROVIDER_ID: 'CRM_TASKS_TASK', COMPLETED: 'N', '<DEADLINE': <now> }` (+ `RESPONSIBLE_ID` when a person is given). This path is covered by the `crm` scope and returns CRM-bound tasks only.
  4. Enriches tasks with `UF_CRM_TASK` bindings (e.g. `L_123` Lead, `D_456` Deal, `C_789` Contact) — or synthesized `{ entityTypeId, entityId, activityId }` objects in fallback mode — plus `daysOverdue`, `deadline`, `title`, `completed`, `responsibleId` and `responsibleName` (resolved via `user.get` with `select: ['ID','NAME','LAST_NAME']`, best-effort).
  5. Returns `{ source: 'tasks.task.list' | 'crm.activity.list', warning?, count, tasks[] }` so the caller always knows which path produced the data and why.

#### 5. `find_contact(query)`
- **Purpose:** Fast unified person search across Contacts (`entityTypeId: 3`), Leads (`entityTypeId: 1`), and Deals (`entityTypeId: 2`) by name, surname, or phone number.
- **Inputs:**
  - `query` (`imię/telefon`: string, e.g. `"Gurung"`, `"+48500..."`, `"Ram"`).
- **Execution Logic:**
  1. If `query` contains digits (`>= 5` digits), normalizes phone format and searches `PHONE` via `crm.item.list` filter plus substring matching on phone numbers.
  2. Searches Contacts by `NAME`, `LAST_NAME`, and `UF_CRM_1787824193587` (`Surname!!!`), Deals by `TITLE`, `UF_CRM_1787745014165` (`Name`), `UF_CRM_1787745029864` (`Surname`), and Leads by `TITLE`, `NAME`, `LAST_NAME`.
  3. Returns matching Contacts, linked Deals (with stage, project, TRC/WP validity dates), and Leads, with all file fields stripped per RODO rules.

### 4.5. Firebase Authentication + Google OAuth 2.0 Implementation (`src/lib/server/mcp/bitrix/auth.ts` & `src/mcp-runner.ts`)

1. **Client-Side Login Page (`GET /oauth/authorize`)**:
   - Loads Firebase JS SDK (`https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js` and `https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js`) configured with:
     - `apiKey`: `PUBLIC_FIREBASE_APIKEY` (`AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M`)
     - `authDomain`: `PUBLIC_FIREBASE_AUTH_DOMAIN` (`eisg-fleet.firebaseapp.com`)
     - `projectId`: `PUBLIC_FIREBASE_PROJECT_ID` (`eisg-fleet`)
   - Renders two real authentication options (matching `src/routes/login/+page.svelte`):
     - **"Sign in with Google" button** (`signInWithPopup(auth, googleProvider)` with `prompt: 'select_account'`)
     - **Email & Password form** (`signInWithEmailAndPassword(auth, email, password)`)
   - Once Firebase authenticates the user, the client script calls `await userCredential.user.getIdToken()` and submits a hidden `<form method="POST" action="/oauth/authorize">` containing `id_token`, `redirect_uri`, `state`, `code_challenge`, and `code_challenge_method`.

2. **Server-Side Firebase Token Verification (`POST /oauth/authorize`)**:
   - Initializes `firebase-admin` (`initialize()` from `src/lib/server/db/firebase/firebase.ts`) and verifies the submitted `id_token`:
     ```typescript
     const decoded = await admin.auth().verifyIdToken(idToken, true);
     const email = (decoded.email || '').toLowerCase();
     const domain = email.split('@')[1];
     if (!email || !domain || !ALLOWED_DOMAINS.includes(domain)) {
         // Reject with 403 Forbidden
     }
     ```
   - Generates a short-lived (5-minute) HMAC-SHA256 signed authorization code (`createSignedOAuthCode({ uid: decoded.uid, email, exp: Date.now() + 300_000, codeChallenge, codeChallengeMethod })`) signed with `MCP_SECRET_TOKEN`.
   - Redirects (`302`) to `redirect_uri?code=<signed_code>&state=<state>`.

3. **Token Exchange (`POST /oauth/token`)**:
   - Verifies the HMAC-signed `code` and checks `exp > Date.now()`.
   - If `codeChallenge` was included in the `code` payload, verifies `code_verifier` (supporting both `S256` SHA-256 base64url and `plain`).
   - Issues a signed user access token (`createSignedMcpAccessToken({ uid, email, iat, exp })` -> `mcp_u_<base64url>.<hmac>`).

4. **MCP Request Verification (`verifyMcpRequest` in `src/lib/server/mcp/bitrix/auth.ts`)**:
   - Accepts either:
     - **Signed OAuth User Token (`mcp_u_...`)**: Verifies the HMAC signature and expiration, checks `domain in ALLOWED_DOMAINS`, and sets `accountId = payload.email` and `email = payload.email` for Firestore audit logging.
     - **Static Secret Token (`MCP_SECRET_TOKEN`)**: Constant-time comparison via Bearer header, `?token=`, or `/mcp/<token>` for CLI/OpenCode usage.

---

## 5. Google Cloud Run (`europe-west1`) & Subdomain (`bitrix.eisg.pl`) Binding Architecture

### 5.1. Cloud Run Service Configuration (Minimal Runner)
- **GCP Project:** `eisg-fleet` (same project hosting App Engine `manage.eisg.pl` / `jobs.eisg.pl` and Firestore).
- **Service Name:** `bitrix-mcp`
- **Region:** **`europe-west1`** (Belgium) — this is what `cloudbuild.mcp.yaml` actually deploys to and what the live service reports (`bitrix-mcp-316084914720.europe-west1.run.app`). `europe-central2` (Warsaw) remains an option only if Cloud Run domain mapping is not required, since direct domain mappings are not available in every region.
- **Container Footprint:** Uses `Dockerfile.mcp` + `scripts/build-mcp-runner.mjs` to bundle **only** `src/mcp-runner.ts` (`~40 KB`) and 4 runtime dependencies (`@modelcontextprotocol/sdk`, `axios`, `firebase-admin`, `zod`). No SvelteKit UI routes, components, or unrelated packages are included in the container.
- **Service Account & Firestore/Auth Access:** Uses the default service account in `eisg-fleet` so `firebase-admin` can both verify Firebase Auth ID tokens (`admin.auth().verifyIdToken`) and write audit logs to Firestore (`bitrixMcpLog.fdb.ts`) with zero extra credential files needed in Cloud Run.

### 5.2. Custom Subdomain Mapping (`bitrix.eisg.pl`)
To bind `https://bitrix.eisg.pl` to the `bitrix-mcp` service:
1. Deploy the minimal container:
   ```powershell
   npm run mcp:deploy
   # or: gcloud builds submit --config=cloudbuild.mcp.yaml --project=eisg-fleet
   ```
2. Map `bitrix.eisg.pl` to the Cloud Run service:
   ```powershell
   gcloud beta run domain-mappings create --service=bitrix-mcp --domain=bitrix.eisg.pl --region=europe-west1 --project=eisg-fleet
   ```
   And add the `CNAME` record (`bitrix` -> `ghs.googlehosted.com.`) in the `eisg.pl` DNS zone.

---

## 6. Task Checklist

### Phase 1: Dependencies, Environment & Provisioning Script
- [x] **Task 1.1:** Add `@modelcontextprotocol/sdk` and `zod` to `package.json` dependencies.
- [x] **Task 1.2:** Update `.env` (and `.env.example`) to ensure `BITRIX24_WEBHOOK_URL`, `MCP_SECRET_TOKEN`, `MCP_OAUTH_CLIENT_ID`, and `MCP_OAUTH_CLIENT_SECRET` are defined.
- [x] **Task 1.3:** Create `scripts/bitrix-provision-fields.ts` to inspect `crm.contact.userfield.list` and create the missing Contact document expiration date fields via `crm.contact.userfield.add` (`UF_CRM_CONTACT_TRC_VALIDITY`, `UF_CRM_CONTACT_VISA_VALIDITY`, `UF_CRM_CONTACT_WP_VALIDITY`, `UF_CRM_CONTACT_PASSPORT_VALIDITY`, and `UF_CRM_CONTACT_REFERRER`).

### Phase 2: Firestore Audit Logger (`.fdb.ts`)
- [x] **Task 2.1:** Create `src/lib/server/db/firebase/bitrixMcpLog.fdb.ts` modeled strictly on `src/lib/server/db/firebase/template.fdb.ts` (`setBitrixMcpLog`, `getBitrixMcpLog`, `findBitrixMcpLogs`, `addBitrixMcpLog`) using `collectionRef(accountId)`.

### Phase 3: Read-Only Bitrix Client & RODO Sanitizer
- [x] **Task 3.1:** Create `src/lib/server/mcp/bitrix/config.ts` containing the immutable `ALLOWED_BITRIX_METHODS` whitelist, `ALLOWED_CRM_ENTITY_TYPES` (`1, 2, 3, 7`), RODO blocked field keys, user aliases (`Ramod=14`, `DK=16`, `Darya=18`, `Michał=1`), and stage/source dictionaries.
- [x] **Task 3.2:** Create `src/lib/server/mcp/bitrix/sanitizer.ts` with `sanitizeSelectFields(select)` and `sanitizeBitrixPayload(data)` to strip all file objects, scan URLs, `PHOTO`, `FILES`, and portal logins/passwords.
- [x] **Task 3.3:** Create `src/lib/server/mcp/bitrix/client.ts` implementing `callBitrixReadOnly(method, params)` and `fetchBitrixPaginatedReadOnly(method, params, maxRecords)` using `BITRIX24_WEBHOOK_URL` from `.env`, throwing `BitrixReadOnlyViolationError` on any non-whitelisted method.
- [x] **Task 3.4 (2026-10-29 fix):** Surface Bitrix API errors from `err.response.data` (`insufficient_scope` + scope hint instead of a bare `status code 401`), and teach `fetchBitrixPaginatedReadOnly` the `tasks.task.list` shape `{ result: { tasks: [...] } }`.

### Phase 4: Low-Level & High-Level MCP Tools
- [x] **Task 4.1:** Create `src/lib/server/mcp/bitrix/tools.lowlevel.ts` registering the 9 whitelisted Bitrix tools (`crm_item_list`, `crm_item_get`, `crm_item_fields`, `crm_category_list`, `crm_status_list`, `crm_stagehistory_list`, `crm_activity_list`, `tasks_task_list`, `user_get`).
- [x] **Task 4.2:** Create `src/lib/server/mcp/bitrix/tools.highlevel.ts` implementing:
  - `order_fill(project)`
  - `funnel_stats(from, to, source)`
  - `expiring_documents(days, includeAlreadyExpired)`
  - `overdue_tasks(person)`
  - `find_contact(query)`
- [x] **Task 4.3:** Create `src/lib/server/mcp/bitrix/server.ts` instantiating the `McpServer`, wrapping every tool execution with timing, error catching, RODO output sanitization, and `setBitrixMcpLog` / `addBitrixMcpLog` audit logging to Firestore.
- [x] **Task 4.4 (2026-10-29 fix):** Harden `overdue_tasks` — primary `tasks.task.list` path, `crm.activity.list` (`PROVIDER_ID: 'CRM_TASKS_TASK'`) fallback on `insufficient_scope`, unified task normalization (`crmBindings`, `daysOverdue`, `completed`), best-effort `responsibleName` via `user.get`, and `source` / `warning` in the response.

### Phase 5: Firebase Authentication (Google OAuth 2.0 + Email/Password) & Streamable HTTP Runner
- [x] **Task 5.1:** Update `src/lib/server/mcp/bitrix/auth.ts` to add `createSignedOAuthCode`, `verifySignedOAuthCode`, `createSignedMcpAccessToken`, `verifySignedMcpAccessToken`, PKCE `S256` verification, and update `verifyMcpRequest` to validate both HMAC-signed Firebase user tokens (`mcp_u_...`) and the static `MCP_SECRET_TOKEN`.
- [x] **Task 5.2:** Update `src/mcp-runner.ts` (and `src/routes/oauth/authorize/+server.ts` + `src/routes/oauth/token/+server.ts`) so:
  - `GET /oauth/authorize` renders the Firebase Authentication UI supporting **Sign in with Google** (`GoogleAuthProvider` popup) and **Firebase Email + Password** (`signInWithEmailAndPassword`).
  - `POST /oauth/authorize` verifies the Firebase `id_token` on the server via `admin.auth().verifyIdToken(idToken, true)`, enforces `@eisg.pl` / `@finnergroup.com` domain membership, and redirects with a signed authorization `code`.
  - `POST /oauth/token` validates the signed `code` + PKCE `code_verifier` and returns the user's signed Bearer token.
- [x] **Task 5.3:** Update `scripts/build-mcp-runner.mjs` to expose `PUBLIC_FIREBASE_APIKEY` and `PUBLIC_FIREBASE_AUTH_DOMAIN` to `src/mcp-runner.ts` and rebuild `dist-mcp/server.mjs`.
- [x] **Task 5.4:** Add unit tests in `src/lib/server/mcp/bitrix/__tests__/mcp-bitrix.test.ts` covering signed OAuth code/token creation, PKCE `S256` verification, and rejection of unverified/forged tokens.

### Phase 6: Cloud Run Deployment & Subdomain Mapping
- [x] **Task 6.1:** Create `Dockerfile.mcp` (copying and bundling ONLY the minimal MCP runner files into `dist-mcp/server.mjs` with 4 runtime dependencies) and `cloudbuild.mcp.yaml`.
- [x] **Task 6.2:** Run `npm run mcp:deploy` (`gcloud builds submit --config=cloudbuild.mcp.yaml --project=eisg-fleet`) to deploy the updated Firebase Auth OAuth flow to Google Cloud Run (`service: bitrix-mcp`).
- [x] **Task 6.3 (2026-10-29 fix):** Rebuild `dist-mcp/server.mjs` and redeploy after the task-reading fixes — Cloud Build `7551af77`, revision **`bitrix-mcp-00005-x8g`** serving 100% traffic in `europe-west1`. Verified `overdue_tasks` end-to-end (fallback mode before the scope grant, primary mode after). Noted: the deploy logs a harmless `Setting IAM policy failed` warning (allUsers invoker binding must be granted by the project owner).
- [x] **Task 6.4 (2026-10-29, portal-side):** Add the **`task`** scope to the incoming webhook in Bitrix24 (Developer resources → Other → Incoming webhook → edit). Token/URL unchanged, so no `.env` or Cloud Run env update was needed; `tasks.task.list` and `tasks.task.get` now return `200`.

---

## 7. Verification Criteria

The implementation must pass all of the following automated and manual verification checks:

1. **Unit & Integration Test Suite (Vitest):**
   ```powershell
   npx vitest run src/lib/server/mcp/bitrix/__tests__/mcp-bitrix.test.ts
   ```
   Must verify:
   - **Read-Only Enforcement:** Calling `callBitrixReadOnly('crm.item.add', ...)` or `crm.lead.update` or `crm.deal.delete` throws `BitrixReadOnlyViolationError` and logs `status: 'BLOCKED_WRITE_ATTEMPT'` to `bitrixMcpLog.fdb.ts`.
   - **Entity Type Restriction:** Calling `crm_item_list` with `entityTypeId: 4` (Company), `5` (old invoice), `8` (requisite), `31` (Invoice) or `36`/`39` (Documents) is rejected, while `7` (Quote/Oferta) is accepted; a missing `entityTypeId` is rejected too.
   - **RODO Sanitizer:** Payloads containing `PHOTO`, `FILES`, `downloadUrl`, `UF_CRM_1787749544391` (Trusted profile password) have those fields stripped before returning to the MCP caller.
   - **Firebase OAuth & Token Verification:** Unverified emails or forged Bearer tokens are rejected (`401`/`403`); valid HMAC-signed tokens issued after `admin.auth().verifyIdToken` authenticate with the user's verified `@eisg.pl` / `@finnergroup.com` email.
   - **Firestore Audit Logging:** Every tool execution calls `setBitrixMcpLog` / `addBitrixMcpLog` with `accountId` (verified user email), `toolName`, `bitrixMethods`, `params`, `durationMs`, and `createdAt`.
   - **High-Level Tools:** `order_fill`, `funnel_stats`, `expiring_documents`, `overdue_tasks`, and `find_contact` return valid structured JSON matching live Bitrix24 schemas.
   - **Task Reading & Scope Handling:** `tasks_task_list` returns Bitrix' own error (`insufficient_scope`) rather than a generic 401; `fetchBitrixPaginatedReadOnly('tasks.task.list', …)` returns every task in `result.tasks` (not one collapsed record); `overdue_tasks` reports `source: 'tasks.task.list'` with the scope granted and `source: 'crm.activity.list'` + `warning` without it.

2. **Standalone MCP Bundle Build Check:**
   ```powershell
   node scripts/build-mcp-runner.mjs
   ```

3. **Streamable HTTP MCP Handshake & Tool Call Smoke Test:**
   ```powershell
   curl -i -X POST "https://bitrix.eisg.pl/mcp/$env:MCP_SECRET_TOKEN" `
     -H "Content-Type: application/json" `
     -H "Accept: application/json, text/event-stream" `
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"claude-test","version":"1.0.0"}}}'
   ```

4. **Live Task Read Smoke Test (verified 2026-10-29):**
   - Raw webhook pre-check (fastest way to tell a scope problem from an MCP problem):
     ```powershell
     curl -s -X POST "$env:BITRIX24_WEBHOOK_URL/tasks.task.list" `
       -H "Content-Type: application/json" -d '{"select":["ID","TITLE","DEADLINE"]}'
     # 200 + {"result":{"tasks":[...]}}  -> scope OK
     # 401 {"error":"insufficient_scope"} -> add the "task" scope to the webhook (§2.5, Task 6.4)
     ```
   - MCP level: `tasks_task_list` returns `{ result: { tasks: [...] } }`; `overdue_tasks({person:"DK"})` returns `source: "tasks.task.list"` (not the fallback) with `responsibleName` and `crmBindings` populated.
   - Regression guard: temporarily filter `PROVIDER_ID: 'CRM_TASKS_TASK'` through `crm_activity_list` to confirm the fallback path still works if the scope is ever removed.

---

## 8. Manual Setup & Client Integration Instructions

### 8.1. Manual Steps Required From You (Cannot Be Run via CLI)

#### Step 0: Verify Incoming Webhook Scopes (`crm`, `task`, `user`) (1 minute)
The MCP depends on the permissions baked into the incoming webhook in `BITRIX24_WEBHOOK_URL`. **`task` is a separate scope from `crm`** — without it every task tool fails with `401 insufficient_scope` (this happened live, see §2.5):
1. Bitrix24 → **Developer resources** → **Other** → **Incoming webhook** → edit `.../rest/1/o0a54hervvwqx6tk/`.
2. Ensure **CRM**, **Tasks** and **Users** are ticked, save. The token/URL does not change, so no `.env` or Cloud Run env update is needed.
3. Verify instantly:
   ```powershell
   curl -s -X POST "$env:BITRIX24_WEBHOOK_URL/tasks.task.list" -H "Content-Type: application/json" -d '{"select":["ID","TITLE"]}'
   ```
   `200` + `{"result":{"tasks":[...]}}` = OK; `401 insufficient_scope` = scope still missing.

#### Step 1: Authorize `bitrix.eisg.pl` in Firebase Authentication Console (1 minute)
Because the `/oauth/authorize` login page runs on `https://bitrix.eisg.pl` and opens the Google Sign-In popup via Firebase Auth, Firebase requires `bitrix.eisg.pl` to be listed in its **Authorized domains**:
1. Open the [Firebase Console](https://console.firebase.google.com/) and select the **`eisg-fleet`** project.
2. In the left sidebar, go to **Build -> Authentication** -> click the **Settings** tab -> click **Authorized domains**.
3. Click **Add domain**, enter **`bitrix.eisg.pl`**, and click **Add**.

#### Step 2: Verify DNS CNAME Record for `bitrix.eisg.pl` (If not already active)
In your DNS provider for `eisg.pl`:
- Ensure there is a `CNAME` record:
  - **Name / Host:** `bitrix`
  - **Target / Value:** `ghs.googlehosted.com.`
  - *(If using Cloudflare, set Proxy status to **DNS only / Grey cloud** while Google Cloud Run provisions the managed SSL certificate).*

#### Step 3: Connect in Claude.ai Web / Desktop
1. Open **Claude.ai** -> **Settings** -> **Connectors / Integrations** -> **Add Custom Connector**.
2. Fill in the connector form:
   - **Remote MCP Server URL:** `https://bitrix.eisg.pl/mcp`
   - **OAuth Client ID *(optional)*:** `eisg-bitrix-mcp-client` *(or leave blank)*
   - **OAuth Client Secret *(optional)*:** `eisg-bitrix-mcp-secret-key-987654321` *(or leave blank)*
3. Click **Connect**.
4. A popup window will open to `https://bitrix.eisg.pl/oauth/authorize`:
   - Click **"Sign in with Google"** (and select your `@eisg.pl` or `@finnergroup.com` Google account), **OR**
   - Enter your existing `manage.eisg.pl` Firebase email and password.
5. Firebase & `firebase-admin` will verify your credentials and redirect you back to Claude.ai with a verified access token.

---

### 8.2. Direct Secret Token Integration (For Claude Code, OpenCode, CLI)
For CLI tools or local agents that do not use interactive browser OAuth, pass the 64-character secret token directly:
1. **URL Path Token:**
   `https://bitrix.eisg.pl/mcp/nUYbkGydwzTBJoYSAQKbRblOA1L8gY3OEOgcCuTowTlvGeykoChjVFD7rDqKdDYa`
2. **Query Parameter:**
   `https://bitrix.eisg.pl/mcp?token=nUYbkGydwzTBJoYSAQKbRblOA1L8gY3OEOgcCuTowTlvGeykoChjVFD7rDqKdDYa`
3. **Authorization Header:**
   `Authorization: Bearer nUYbkGydwzTBJoYSAQKbRblOA1L8gY3OEOgcCuTowTlvGeykoChjVFD7rDqKdDYa`
