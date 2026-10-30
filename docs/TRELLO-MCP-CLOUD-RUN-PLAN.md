# Implementation Specification: Trello Card Assignment MCP Server on Google Cloud Run (`trello-card-assignment.eisg.pl`)

## 1. Executive Summary

This document specifies the architecture, implementation, and deployment of a dedicated, minimal Model Context Protocol (MCP) server designed to assign members to Trello cards dynamically.

- **MCP Domain:** `https://trello-card-assignment.eisg.pl`
- **Cloud Run Service:** `trello-card-assignment-mcp`
- **Region:** `europe-west1` (GCP Project: `eisg-fleet`)
- **Primary Tool:** `assign_member_to_card` (with dynamic `ticketId` / `cardId` and `memberId` / `username`)
- **Auxiliary Tool:** `get_card_info` (verifies card existence, details, and current assigned members)

### Key Capabilities & Know-How (from `trello.js`):
1. **Dynamic Inputs:** Accepts any valid Trello card ID or shortLink (e.g., `'z9NsKqCk'`) and any member identifier (numeric/hex ID or `@username` / `username`).
2. **Pre-Assignment Card Verification:** Verifies the card exists and retrieves current membership via `GET /1/cards/{ticketId}`.
3. **Username Resolution:** Automatically converts Trello usernames (e.g. `'@daryavinahrad2'` or `'daryavinahrad2'`) into canonical Trello member IDs via `GET /1/members/{username}`.
4. **Member Assignment:** Executes `POST /1/cards/{ticketId}/idMembers?value={resolvedMemberId}`.
5. **Post-Assignment Verification:** Confirms that `resolvedMemberId` is present in the card's `idMembers` array and returns a clean, structured payload.

---

## 2. Architecture Decisions

### 2.1. Minimal Standalone Container Runner
- Following the proven architecture of `bitrix-mcp`:
  - Entry point: `src/trello-mcp-runner.ts`
  - Compiled using `esbuild` (`scripts/build-trello-mcp-runner.mjs`) into a ~35 KB bundle (`dist-trello-mcp/server.mjs`).
  - Container (`Dockerfile.trello-mcp`) only installs 4 runtime dependencies:
    - `@modelcontextprotocol/sdk`
    - `axios`
    - `firebase-admin`
    - `zod`
  - Excludes all SvelteKit UI components, routes, and unrelated project libraries.

### 2.2. Authentication & Security
1. **URL Secret Token / Bearer Token:**
   - Dedicated Token: `fefd98378da236c1990ba71f5612299e6e8083cb65e62a76c8cb15bbfa5c6891`
   - Supported paths: `/mcp/<MCP_SECRET_TOKEN>`, `/mcp?token=<MCP_SECRET_TOKEN>`, or header `Authorization: Bearer <MCP_SECRET_TOKEN>`.
2. **OAuth 2.0 (Claude Custom Connector):**
   - RFC 8414 Discovery: `/.well-known/oauth-authorization-server`
   - Authorization UI: `/oauth/authorize` (Google Sign-In + Firebase Email/Password)
   - Domain Restriction: Exclusively `['finnergroup.com']` (array syntax preserved for future additions)
   - Client ID: `finner-trello-card-assignment-mcp`
   - Client Secret: `497156171ee5ad92814a302bb0a3c89ff37b465584171a9f`
   - Token Endpoint: `/oauth/token` (PKCE S256 + HMAC-signed tokens)
3. **Audit Logging (Firestore):**
   - Collection: `streamer/{accountId}/trelloMcpLogs`
   - Records caller identity, tool name, card ID, member ID, execution duration, and outcome status (`SUCCESS` / `ERROR`).

---

## 3. Affected Files

### Files to Create:
1. `docs/TRELLO-MCP-CLOUD-RUN-PLAN.md` — This specification and execution tracker.
2. `src/lib/server/db/firebase/trelloMcpLog.fdb.ts` — Firestore audit logger for Trello MCP operations.
3. `src/lib/server/mcp/trello/config.ts` — Configuration, env loader, and constants.
4. `src/lib/server/mcp/trello/client.ts` — Trello API client (card lookup, member resolution, member assignment).
5. `src/lib/server/mcp/trello/tools.ts` — MCP tool registration for `assign_member_to_card` and `get_card_info`.
6. `src/lib/server/mcp/trello/server.ts` — McpServer factory with Firestore audit logging wrapper.
7. `src/trello-mcp-runner.ts` — Minimal Node.js HTTP server implementing Streamable HTTP transport and OAuth 2.0 endpoints.
8. `scripts/build-trello-mcp-runner.mjs` — Esbuild bundling script producing `dist-trello-mcp/server.mjs`.
9. `Dockerfile.trello-mcp` — Production container Dockerfile.
10. `cloudbuild.trello-mcp.yaml` — Google Cloud Build deployment pipeline for Cloud Run `europe-west1`.
11. `src/lib/server/mcp/trello/__tests__/trello-mcp.test.ts` — Unit & integration test suite.

### Files to Edit:
1. `.env` — Add `TRELLO_API_KEY` and `TRELLO_TOKEN`.
2. `package.json` — Add npm script `mcp:trello:deploy` and `mcp:trello:build`.

---

## 4. Task Checklist

- [x] **Task 1: Environment & Firestore Audit Logger**
  - Add `TRELLO_API_KEY` and `TRELLO_TOKEN` to `.env`.
  - Create `src/lib/server/db/firebase/trelloMcpLog.fdb.ts` based on `template.fdb.ts`.
- [x] **Task 2: Trello Client & MCP Tools**
  - Create `src/lib/server/mcp/trello/config.ts`.
  - Create `src/lib/server/mcp/trello/client.ts` implementing `getCard`, `resolveMemberId`, and `assignMemberToCard`.
  - Create `src/lib/server/mcp/trello/tools.ts` defining `assign_member_to_card` and `get_card_info` with Zod schemas.
  - Create `src/lib/server/mcp/trello/server.ts` wiring the tools with audit logging.
- [x] **Task 3: Standalone HTTP Runner & Build Script**
  - Create `src/trello-mcp-runner.ts` with Streamable HTTP transport and Firebase OAuth/token endpoints.
  - Create `scripts/build-trello-mcp-runner.mjs`.
  - Build bundle into `dist-trello-mcp/server.mjs`.
- [x] **Task 4: Unit Testing & Verification**
  - Create `src/lib/server/mcp/trello/__tests__/trello-mcp.test.ts`.
  - Run `npm run check` and targeted vitest suite.
- [x] **Task 5: Containerization & Cloud Run Deployment**
  - Create `Dockerfile.trello-mcp` and `cloudbuild.trello-mcp.yaml`.
  - Add deployment scripts to `package.json`.
  - Deploy to Cloud Run (`trello-card-assignment-mcp` in `europe-west1`).
  - Bind custom domain mapping `trello-card-assignment.eisg.pl`.
- [x] **Task 6: Live Smoke Verification**
  - Verify `/health` endpoint on live Cloud Run.
  - Verify MCP handshake and execute a live tool call.
