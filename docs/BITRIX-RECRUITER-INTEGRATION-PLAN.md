# BITRIX24 RECRUITER ANALYTICS INTEGRATION PLAN

This plan outlines the approach to integrate the Bitrix24 recruiter analytics feature into a separate set of files and endpoints (`/bitrix/recruiter` and `/bitrix/recruiter/api`) within the existing SvelteKit application.

## 1. Recruiter Analytics Integration (New Conditions)

*   **Endpoint Goal:** Evaluate recruiter performance based on the success of their recruited contacts. A contact is deemed successful if they have accumulated a **minimum of 30 worked days** across one or multiple jobs.
*   **Timeframe & Fetching:**
    *   Deals taken into account must span from **2 months ago up to the current day**.
    *   This expanded timeframe is necessary because a contact might have multiple sequential deals (e.g., worked 7 days on one deal, stopped, then started a new job which could begin in the middle of last month). We need to fetch enough deals to accurately group and sum up their total worked days.
    *   **Filter applied:** "Start work" date must fall within the selected past 2-month window.
*   **Calculations & Conditions:**
    *   **Worked Days:** For each deal associated with a contact, calculate the duration in days (End Date - Start Date).
    *   **Totaling:** Sum the "worked days" for all deals tied to a specific person (Bitrix contact).
    *   **Success Condition:** The contact is counted as successful *only* if their total aggregated worked days is $\ge$ 30.
*   **Grouping Mechanism:**
    *   Unlike leads and raw deals, this analytics view is **no longer grouped by the deal's `ASSIGNED_BY_ID`**.
    *   Instead, group the successfully evaluated contacts by their assigned **Recruiter**.
    *   The Recruiter is stored in a custom field on the associated **Contact data** (Field ID: `UF_CRM_1790672831151`).

## 2. Chronological Implementation Steps for Recruiter Analytics

- [x] **Step 1: Fix existing deals endpoint off-by-one day issue**
  - [x] Update `src/routes/bitrix/deals/api/+server.ts` to explicitly format boundaries as `YYYY-MM-DD` and use strictly `<` for the next month's 1st day, or explicitly pass `YYYY-MM-DDT23:59:59` to ensure Bitrix cuts off exactly at the end of the day.
- [x] **Step 2: Update Types and Service for Contacts and Recruiter Deals**
  - [x] Add `CONTACT_ID` and `UF_CRM_1787746186953` (Work End) to `BitrixDeal` in `src/lib/bitrix/bitrix.d.ts`.
  - [x] Create `BitrixContact` interface with `ID`, `NAME`, `LAST_NAME`, and `UF_CRM_1790672831151` (Recruiter) in `src/lib/bitrix/bitrix.d.ts`.
  - [x] Add `getContactsByIds(contactIds)` method to `bitrix.service.ts` to fetch contacts in batches.
- [x] **Step 3: Create Recruiter API Endpoint**
  - [x] Create `src/routes/bitrix/recruiter/api/+server.ts`.
  - [x] Implement logic to:
    1. Parse month/year.
    2. Determine evaluation period (selected month + next month OR yesterday, whichever is first).
    3. Fetch Deals with Work Start in the selected month to get `CONTACT_ID`s.
    4. Fetch ALL deals for those contacts within the evaluation period.
    5. Fetch Contacts for those IDs.
    6. Calculate worked days (empty end date = today).
    7. Aggregate and return enriched JSON.
- [x] **Step 4: Create Recruiter Route Backend**
  - [x] Create `src/routes/bitrix/recruiter/+page.server.ts`.
  - [x] Fetch the Recruiter field metadata to map choice IDs to names.
- [x] **Step 5: Build Recruiter UI**
  - [x] Create `src/routes/bitrix/recruiter/+page.svelte`.
  - [x] Group by Recruiter name. Show totals (started vs. passed $\ge$ 30 days).
  - [x] Join "N/A" (or its ID "1186") with "Unassigned" grouping.
  - [x] Display Contacts, their total worked days (warning style if $< 30$), and nested Deals with links.
- [x] **Step 6: Download Recruiter Stats**
  - [x] Create `DownloadRecruiterStats.svelte` component.
  - [x] Implement function to export the data into an XLSX file with a consolidation sheet and separate sheets per recruiter.
  - [x] Apply styles using `xlsxStyles.ts` (red headers, centered bordered).
  - [x] Add the component to `+page.svelte` in the top right corner.
  - [x] Ran `npm run check` after editing; result: `svelte-check found 0 errors and 0 warnings`.
