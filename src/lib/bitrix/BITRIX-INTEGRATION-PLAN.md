# BITRIX24 LEADS ANALYTICS INTEGRATION PLAN

This plan outlines the approach to integrate a Bitrix24 leads analytics feature into the existing SvelteKit application using native tools and existing infrastructure.

## 1. Setup & Environment
*   **Env Variables:** Add the inbound webhook URL to `.env`:
    ```env
    BITRIX24_WEBHOOK_URL="https://your-domain.bitrix24.com/rest/1/your_secret_token/"
    ```
*   **Dependencies:** `axios` is already installed. Install `dayjs` for robust date math and formatting.

## 2. Shared Types (`src/lib/types/bitrix.d.ts`)
*   Create a dedicated types file to ensure type safety across both the backend (API calls) and the frontend (UI rendering and aggregation).
*   Define interfaces for:
    *   `BitrixLead`: Representing the raw lead data (ID, TITLE, ASSIGNED_BY_ID, OPPORTUNITY, DATE_CREATE, DATE_MODIFY, etc.).
    *   `BitrixUser`: Representing the user data (ID, NAME, LAST_NAME).
    *   `EnrichedLead`: A lead combined with its mapped human-readable user name.
    *   `LeadSummary`: The output structure for frontend aggregation.

## 3. Server-Side Service (`src/lib/server/bitrix/bitrix.service.ts`)
*   Consolidate all Bitrix business logic and API interactions into a dedicated service file.
*   *Note: This is exported as a default top-level object: `export default bitrixService;`*
*   **Axios Configuration:** Setup an instance pointing to `BITRIX24_WEBHOOK_URL`.
*   **Pagination Helper:** Implement a `fetchPaginated` utility to handle Bitrix24's 50-items-per-request limit automatically via the `start` parameter.
*   **Service Methods:**
    *   `getUsers()`: Calls `user.get` to retrieve employee directories.
    *   `getClosedLeads(startDate: string, endDate: string)`: Calls `crm.lead.list` fetching leads filtered by date bounds and successful status (e.g., `CONVERTED`).

## 4. Route Loader (`src/routes/bitrix/leads/+page.server.ts`)
*   **Security:** Skipped for now. Open endpoint for initial development.
*   **Query Parsing:** Read the `?month=MM` and `?year=YYYY` parameters from the URL. If missing, default to the previous calendar month using `dayjs`.
*   **Execution Pipeline:**
    1. Call `bitrixService.getUsers()` to get the employee directory.
    2. Create a User Map for fast ID to Name lookups.
    3. Return the `users` (or `userMap`), `selectedMonth`, and `selectedYear` directly to the page. (We no longer fetch leads here to speed up initial page load).

## 5. API Endpoint (`src/routes/bitrix/leads/api/+server.ts`)
*   Create a dedicated GET endpoint for client-side fetching.
*   Extract `month` and `year` from the URL search parameters.
*   Determine the exact start and end dates via `dayjs`.
*   Call `bitrixService.getClosedLeads(startDate, endDate)`.
*   Return the leads as a JSON response.

## 6. Frontend Aggregation & UI (`src/routes/bitrix/leads/+page.svelte`)
*   **Data Binding:** Receive the users and date parameters using Svelte 5 `$props()`.
*   **Client-Side Fetching (`onMount`):** By default, use `internal.getApi({ year, month })` inside `onMount` to hit the `/bitrix/leads/api` endpoint and fetch the raw leads.
*   **Month Selector:** Implement an HTML `<input type="month" />`. On change, use SvelteKit's `goto('?month=...', { keepFocus: true })` to re-trigger the server `load` function and refetch data.
*   **Client-side Aggregation (`$derived`):** Use Svelte 5 runes to aggregate the data live on the client:
    *   Map the fetched leads using the user dictionary.
    *   Group leads by the responsible person.
    *   Calculate `totalClosedLeads`.
    *   Calculate `totalValue` (sum of `OPPORTUNITY`).
    *   Calculate `averageClosingTime` (using `dayjs` to diff create and close dates).
*   **Display:**
    1.  **Summary Table:** Render the aggregated stats per person.
    2.  **Raw Leads List:** Render the full list of raw leads below the summary for individual review or printing.

---

## 7. Chronological Implementation TODOs

- [x] **Step 1: Environment & Dependencies**
  - [x] Install `dayjs` (`npm install dayjs`).
  - [x] Add `BITRIX24_WEBHOOK_URL` to `.env` (and load it safely in the app).
- [x] **Step 2: Define Types**
  - [x] Create `src/lib/types/bitrix.d.ts` and define `BitrixLead`, `BitrixUser`, and `EnrichedLead` interfaces.
- [x] **Step 3: Build the Service Layer**
  - [x] Create `src/lib/server/bitrix/bitrix.service.ts`.
  - [x] Implement basic Axios call structure.
  - [x] Implement `fetchPaginated` for list endpoints.
  - [x] Implement `getUsers` and `getClosedLeads`.
- [x] **Step 4: Create the Route Backend**
  - [x] Create directory `src/routes/bitrix/leads/`.
  - [x] Create `+page.server.ts`.
  - [x] Fetch users and return them alongside the default `selectedMonth` and `selectedYear` values.
- [x] **Step 5: Create API Endpoint for Client Fetching**
  - [x] Create directory `src/routes/bitrix/leads/api/`.
  - [x] Create `+server.ts` GET endpoint.
  - [x] Parse date params and call `bitrixService.getClosedLeads()`, returning JSON.
- [x] **Step 6: Build the UI and Aggregation**
  - [x] Create `+page.svelte`.
  - [x] Fetch leads via `internal.getApi()` on component mount.
  - [x] Add 12-month navigation list generator.
  - [x] Implement `$derived` logic to group and summarize leads by responsible person.
  - [x] Build the HTML markup for the Summary Table and Raw Leads List (Expandable).

## 8. Deals Integration TODOs

- [x] **Step 7: Extend Types and Service for Deals**
  - [x] Add `BitrixDeal` interface to `src/lib/bitrix/bitrix.d.ts`.
  - [x] Add `getClosedDeals(startDate, endDate)` method to `src/lib/bitrix/bitrix.service.ts` using `crm.deal.list` (filter by `STAGE_SEMANTIC_ID: 'S'` which means successful, or the exact winning stage ID).
- [x] **Step 8: Create Route Backend for Deals**
  - [x] Create directory `src/routes/bitrix/deals/`.
  - [x] Create `+page.server.ts` (can be similar to leads).
- [x] **Step 9: Create API Endpoint for Deals**
  - [x] Create directory `src/routes/bitrix/deals/api/`.
  - [x] Create `+server.ts` GET endpoint to fetch closed deals.
- [x] **Step 10: Build the Deals UI**
  - [x] Create `src/routes/bitrix/deals/+page.svelte`.
  - [x] Implement the same 2-col UI layout and user aggregation as Leads, but for Deals.
  - [x] Update `BASE_URL` to point to Deals in Bitrix (`/crm/deal/details/`).