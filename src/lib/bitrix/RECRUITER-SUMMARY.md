# Recruiter Fields: Current Values & Summary

## 1. CRM Field Inventory & Live Values

### Contact Field (`CRM_CONTACT`)
* **Field Code:** `UF_CRM_1790672831151` (ID: `524`)
* **Type:** `enumeration`
* **Options:**
  * `870` : `Ramod Timilsina` (`XML_ID: b95961091f062a9544e7cd8845c0a063`)
  * `1186` : `N/A` (`XML_ID: a1da18a1a8abdbcf74bc98dfe908943f`)

---

### Lead Field (`CRM_LEAD`)
* **Field Code:** `UF_CRM_LEAD_RECRUITER` (ID: `656`)
* **Type:** `enumeration`
* **Mandatory / Required:** Required starting at stage **"Contact attempt"** (`STATUS_ID: UC_ESUI05`)
* **Visibility:** `YES` (`optionFlags: 1`, visible in common Card Form Layout)
* **Default:** `N/A` (automatically applied to all inbound channels)
* **Options:**
  * `1194` : `Ramod Timilsina` (`XML_ID: b95961091f062a9544e7cd8845c0a063`)
  * `1196` : `N/A` (`XML_ID: a1da18a1a8abdbcf74bc98dfe908943f`, `DEF: Y`)

---

### Deal Field (`CRM_DEAL`)
* **Field Code:** `UF_CRM_DEAL_RECRUITER` (ID: `658`)
* **Type:** `enumeration`
* **Legacy String Field:** `UF_CRM_1790681629518` (ID: `636`, `string`)
* **Options:**
  * `1198` : `Ramod Timilsina` (`XML_ID: b95961091f062a9544e7cd8845c0a063`)
  * `1200` : `N/A` (`XML_ID: a1da18a1a8abdbcf74bc98dfe908943f`, `DEF: Y`)

---

## 2. Synchronization & Architecture Rules

1. **Inbound Channels (Chat / Web / Facebook):** Default to `"N/A"` (`1196`).
2. **Stage Requirement:** Enforced at stage **"Contact attempt"** (`UC_ESUI05`).
3. **Lead Conversion Mapping:** Bitrix maps Lead $\rightarrow$ Contact using matching `XML_ID`s:
   * `b95961091f062a9544e7cd8845c0a063` $\rightarrow$ `Ramod Timilsina`
   * `a1da18a1a8abdbcf74bc98dfe908943f` $\rightarrow$ `N/A`
4. **Edit Trigger on Lead (Bitrix Native Automation):**
   * Configured via native Bitrix24 Robot or Workflow (no external webhook server needed).
   * **Rule:** When Lead Recruiter changes from `"N/A"` to an actual recruiter, the robot updates the linked Contact's Recruiter **only if** the Contact's current Recruiter is `"N/A"` (ID `1186`).

---

## 3. Bitrix24 Configuration Checklist

1. **CRM Settings > Lead Field Mapping:**
   * Map `UF_CRM_LEAD_RECRUITER` $\rightarrow$ `UF_CRM_1790672831151`.
2. **Lead Form Card Settings:**
   * Click gear icon (⚙️) on `Recruiter` field $\rightarrow$ check **"Required starting with stage"** $\rightarrow$ select **"Contact attempt"** (`UC_ESUI05`).
3. **CRM Automation (Robots):**
   * Under Leads > Automation rules, add robot **"Edit element"** (or Business Process):
     * Target: Linked Contact
     * Action: Set `Contact.Recruiter = {{Lead:Recruiter}}`
     * Condition: `Lead.Recruiter != N/A` AND `Contact.Recruiter == N/A`.

---

## 4. Recruiter Performance & Payout Engine (`/bitrix/recruiter`)

### 4.1 Evaluation Rules & Quota Metrics
* **30-Day Threshold:** A candidate qualifies for commission only if their cumulative worked days across all deal assignments reaches $\ge 30$ days.
* **Exclusion of Unassigned & "N/A":**
  * Contacts where the Recruiter is unassigned, empty, or set to `"N/A"` (Enum ID `1186`) are strictly excluded from:
    * `totalContractors` (tracked assigned contractors count)
    * `totalPassed` (benchmark passed count)
    * Quota provision calculations
  * Unassigned contacts are tracked and displayed separately (`unassignedCount` and `{assignedPercentage}% assigned`).
* **Default Payout Value:** Default payout = `passed contractors * €150`.

### 4.2 Payout Workflow & Persistence
* **Payment Modal:** Users can select an eligible assigned recruiter, view their qualifying contractors (names, IDs, days), and submit custom or auto-calculated payout values.
* **API Handler (`/bitrix/recruiter/api`):**
  * `POST`: Receives `month`, `year`, `recruiterId`, `recruiterName`, `payoutValue`, `note`, and `includedContractors` (`[{ id, name, days }]`), saving via `$lib/server/db/firebase/recruiterPayout.fdb.ts`.
  * `GET`: Fetches and returns saved payouts alongside evaluated contacts, bypassing stale caches with `no-cache`.
* **Database Layer:** Stored in Firebase Firestore collection `recruiterPayouts` (`src/lib/server/db/firebase/recruiterPayout.fdb.ts`).
* **Page Rendering:**
  * Loaded in `src/routes/bitrix/recruiter/+page.server.ts`.
  * Displayed in `src/routes/bitrix/recruiter/+page.svelte` in the KPI metrics cards, the period overview table, and recruiter card payment badges.
