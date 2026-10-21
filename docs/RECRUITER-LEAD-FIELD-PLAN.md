# Plan: Bitrix24 Lead, Contact & Deal Recruiter Field Synchronization

## 1. Executive Summary & Objective

This document outlines the architectural blueprint and implementation plan for introducing a **Recruiter** field to **Leads** in Bitrix24, aligning its options with both **Deals** and **Contacts**, and establishing conditional synchronization between Leads and Contacts.

### Core Requirements:
1. **Option Alignment Across CRM Entities (Deals $\rightarrow$ Contacts $\rightarrow$ Leads):** As much as possible, the **Contacts** field "Recruiter" (`UF_CRM_1790672831151`) must have the exact same options to choose from as the **Deal** Recruiter field (`UF_CRM_1790681629518`). In turn, the new **Leads** field must mirror these identical options.
2. **Standardized Fallback ("N/A"):** Standardize on `"N/A"` (without spaces) as the default fallback across all entities (Contact Enum ID `1186`).
3. **Channel Automation ("N/A" Default):** Inbound channels (Live Chat, Website Forms, Facebook Lead Ads, Open Channels, etc.) must automatically default this field to `"N/A"` without failing validation.
4. **Manual Lead Requirement:** Manual lead creation by internal agents must enforce selecting a specific Recruiter in the Bitrix CRM card/stage.
5. **Lead-to-Contact Field Mapping:** Map the Lead Recruiter field to the Contact Recruiter field so that conversion natively carries over the selection.
6. **Triggered Sync on Lead Edit (Restricted to "N/A"):** When a lead's Recruiter is edited inside Bitrix24 (e.g. changing from `"N/A"` to an actual recruiter), the change must synchronize down to the linked Contact. To protect historical attribution, **this update must only apply if the Contact's current recruiter is `"N/A"` (or unassigned/empty)**.
7. **Infrastructure & Tooling:** Use the **Bitrix MCP** (`bitrix-rest`) for validating REST API signatures, and execute all API operations through `BITRIX24_WEBHOOK_URL` defined in `.env`.

---

## 2. Environment & MCP Integration

### 2.1 Environment Variable
The application communicates with Bitrix24 via the private inbound webhook configured in `.env`:
```env
BITRIX24_WEBHOOK_URL="https://your-domain.bitrix24.com/rest/1/your_secret_token/"
```
This is loaded securely in SvelteKit server code via:
```ts
import { BITRIX24_WEBHOOK_URL } from '$env/static/private';
```

### 2.2 Bitrix MCP Tools Reference
Developers and AI assistants must use the connected **Bitrix MCP** (`bitrix-rest`) tools to inspect signatures, structures, and constraints:
- `bitrix-rest_bitrix-search`: Discover methods and event signatures (e.g. query `crm.lead.userfield.add`, `crm.contact.userfield.update`, `crm.deal.fields`, `ONCRMLEADUPDATE`).
- `bitrix-rest_bitrix-method-details`: Retrieve exact parameter types and payloads:
  - `crm.deal.fields` / `crm.deal.userfield.get`: Inspect Deal Recruiter field definition (`UF_CRM_1790681629518`).
  - `crm.contact.userfield.get` / `crm.contact.userfield.update`: Update Contact Recruiter enum items (`UF_CRM_1790672831151`).
  - `crm.lead.userfield.add` / `crm.lead.userfield.list`: Define and check Lead Recruiter custom field.
  - `crm.lead.get` / `crm.item.get`: Fetch updated lead data, custom fields, and `CONTACT_ID`.
  - `crm.lead.contact.items.get`: Retrieve linked contacts for a lead.
  - `crm.contact.get`: Inspect current Contact Recruiter value.
  - `crm.contact.update`: Update the Contact Recruiter value.
  - `event.bind`: Register webhook handlers for CRM events.
- `bitrix-rest_bitrix-event-details`: Inspect event payloads (e.g. `Event onCrmLeadUpdate`).

---

## 3. Data Architecture & Field Alignment

### 3.1 Field Inventory Across CRM Entities (Configured & Verified in Bitrix24)

| Entity | Field Code | Field ID | Field Title | Type | Live Options & XML_IDs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Contact** | `UF_CRM_1790672831151` | `524` | `Recruiter` | `enumeration` | - `Ramod Timilsina` (ID: 870, XML_ID: `b95961091f062a9544e7cd8845c0a063`, DEF: N)<br>- `N/A` (ID: 1186, XML_ID: `a1da18a1a8abdbcf74bc98dfe908943f`, DEF: N) |
| **Lead** | `UF_CRM_LEAD_RECRUITER` | `656` | `Recruiter` | `enumeration` | - `Ramod Timilsina` (ID: 1194, XML_ID: `b95961091f062a9544e7cd8845c0a063`, DEF: N)<br>- `N/A` (ID: 1196, XML_ID: `a1da18a1a8abdbcf74bc98dfe908943f`, DEF: Y) |
| **Deal** | `UF_CRM_DEAL_RECRUITER` | `658` | `Recruiter` | `enumeration` | - `Ramod Timilsina` (ID: 1198, XML_ID: `b95961091f062a9544e7cd8845c0a063`, DEF: N)<br>- `N/A` (ID: 1200, XML_ID: `a1da18a1a8abdbcf74bc98dfe908943f`, DEF: Y) |

*Note: All three entities share the identical `XML_ID`s, ensuring lossless mapping during Bitrix24's native conversion.*

### 3.2 Option Synchronization Strategy (Deals $\rightarrow$ Contacts $\rightarrow$ Leads)
All three entities are now aligned with the exact same options:
1. **Deal Field Created:** `UF_CRM_DEAL_RECRUITER` (ID: 658) created as an `enumeration` to align with Contacts and Leads.
2. **Contact Field Verified:** `UF_CRM_1790672831151` (ID: 524) with `"N/A"` (ID: 1186).
3. **Lead Field Created:** `UF_CRM_LEAD_RECRUITER` (ID: 656) with `"N/A"` marked as default (`DEF: "Y"`).

---

## 4. Inbound Channels vs. Manual Creation Strategy

### 4.1 Inbound Channels (Chat, Website, Facebook, Open Channels)
- **Problem:** Automated leads created from external channels do not have a recruiter assigned at creation. If the field is strictly mandatory without a default, incoming leads fail.
- **Solution:**
  1. **Field Default Value:** In `crm.lead.userfield.add`, set `DEF: "Y"` on the `"N/A"` option. Any lead created via API without explicit recruiter data gets `"N/A"`.
  2. **CRM Web Forms:** Add the "Recruiter" field as a hidden field with default value `"N/A"`.

### 4.2 Manual Creation by Internal Agents
- **Enforcement in Bitrix24 UI:**
  1. **Lead Form Layout:** In the Lead Quick-Create and Detail Card settings, mark **Recruiter** as a **Required** field.
  2. **Stage Requirement:** In Bitrix24 CRM Settings > Stages > Leads, configure **Recruiter** as required starting at the initial stage (`NEW`).

---

## 5. Synchronization & Trigger Architecture (Lead $\rightarrow$ Contact)

### 5.1 Native Lead Conversion Field Mapping
In Bitrix24 under **CRM > Settings > CRM Settings > Lead Field Mapping**:
- Map Lead `Recruiter` (`UF_CRM_LEAD_RECRUITER`) $\rightarrow$ Contact `Recruiter` (`UF_CRM_1790672831151`).
- Matching `XML_ID`s during field creation guarantees Bitrix natively transfers the selection accurately without ID mismatch errors.

### 5.2 Post-Creation Lead Edit Trigger (Strict "N/A" Checking)
When a Lead's Recruiter is edited (e.g. changing from `"N/A"` to an actual recruiter), synchronize down to the linked Contact. To protect historical attribution:
- Do **not** act on `null`, `undefined`, or empty strings.
- Only apply the overwrite **if the Contact's current recruiter is strictly `"N/A"`** (Enum ID `1186`).

#### Business Logic & Idempotency:
```
WHEN Webhook is triggered by Lead Update:
    GET Lead
    IF Lead.Recruiter IS CHANGED AND Lead.Recruiter != "N/A":
        GET Linked Contact
        IF Contact EXISTS:
            IF Contact.Recruiter is strictly "N/A" (or ID 1186):
                UPDATE Contact.Recruiter = MappedLeadRecruiterId
                LOG "Contact recruiter updated from N/A to: " + RecruiterName
            ELSE:
                LOG "Contact is NOT strictly 'N/A' (e.g., null, undefined, or legit recruiter); update skipped"
```

#### Trigger Implementation: Native Bitrix24 Automation Rules
Instead of external webhooks, synchronization is handled natively inside Bitrix24 using CRM Automation Rules (Robots) or Workflows:
1. Under **CRM > Leads > Automation rules**, configure an **"Edit related CRM entity"** robot on the stage:
   * **Target:** Linked Contact
   * **Field:** Recruiter (`UF_CRM_1790672831151`)
   * **Value:** `{{Lead:Recruiter}}`
   * **Condition:** `{{Lead:Recruiter}}` does not equal `N/A` AND `{{Contact:Recruiter}}` equals `N/A`.
2. This eliminates external webhook latency, avoids API rate limits, and requires no external server endpoint.

---

## 6. SvelteKit Implementation & Types

### 6.1 TypeScript Types (`src/lib/bitrix/bitrix.d.ts`)
```ts
export interface BitrixLead {
    ID: string;
    TITLE: string;
    STATUS_ID: string;
    ASSIGNED_BY_ID: string;
    CONTACT_ID?: string;
    UF_CRM_LEAD_RECRUITER?: string; // Lead Recruiter Enum ID
    [key: string]: any;
}

export interface BitrixDeal {
    ID: string;
    TITLE: string;
    STAGE_ID: string;
    ASSIGNED_BY_ID: string;
    CONTACT_ID?: string;
    UF_CRM_DEAL_RECRUITER?: string; // Recruiter Enum ID
    [key: string]: any;
}
```

### 6.2 Recruiter Payout Model & Persistence (`src/lib/server/db/firebase/recruiterPayout.fdb.ts`)
```ts
export interface RecruiterPayoutContractor {
    id: string | number;
    name: string;
    days: number;
}

export interface RecruiterPayout {
    id?: string;
    recruiterId: string;
    recruiterName?: string;
    payoutValue: number;
    month: string;
    year: string;
    includedContractors: RecruiterPayoutContractor[];
    createdAt?: string;
    note?: string;
}
```
* **Endpoints:**
  * `POST /bitrix/recruiter/api`: Records payment with month, year, recruiter info, and included contractor days.
  * `GET /bitrix/recruiter/api`: Fetches analytics contacts and matching period payouts.
* **Quota Rules:** Unassigned and `"N/A"` recruiters are excluded from `totalContractors` and `totalPassed` commission calculations. Default payout calculation is `passed contractors * €150`.

---

## 7. Step-by-Step Chronological Implementation Checklist

- [x] **Phase 1: Validate Existing Fields & Options via Bitrix MCP**
  - [x] Use `bitrix-rest_bitrix-search` and `bitrix-rest_bitrix-method-details` to inspect Deal Recruiter and Contact Recruiter.
  - [x] Verify Contact Recruiter has `"N/A"` (ID `1186`).
  - [x] Confirm `BITRIX24_WEBHOOK_URL` in `.env` has valid permissions.

- [x] **Phase 2: Option Alignment (Deals $\rightarrow$ Contacts $\rightarrow$ Leads)**
  - [x] Created `UF_CRM_LEAD_RECRUITER` (ID: 656) with matching options, XML_IDs, and `"N/A"` as default (`DEF: "Y"`).
  - [x] Created `UF_CRM_DEAL_RECRUITER` (ID: 658) with matching options, XML_IDs, and `"N/A"` as default (`DEF: "Y"`).
  - [x] Set Lead card configuration to display `UF_CRM_LEAD_RECRUITER` prominently in the main section (`optionFlags: 1`).

- [ ] **Phase 3: Bitrix24 Portal UI Settings**
  - [ ] In Bitrix CRM Lead Card settings: Set **Recruiter** (`UF_CRM_LEAD_RECRUITER`) to **"Required starting with stage: Contact attempt"** (`UC_ESUI05`).
  - [ ] Under CRM Settings > Lead Field Mapping: Map `UF_CRM_LEAD_RECRUITER` $\rightarrow$ `UF_CRM_1790672831151`.

- [x] **Phase 4: Architecture Simplification**
  - [x] Removed external webhook routes from SvelteKit app.
  - [x] Documented native Bitrix24 automation rule setup for Lead $\rightarrow$ Contact sync.

- [ ] **Phase 5: Bitrix Native Automation Rule Setup**
  - [ ] Add "Edit Contact" Robot in Bitrix24 Lead Automation:
    - Action: Set Contact Recruiter = `{{Lead:Recruiter}}`
    - Condition: `Lead.Recruiter != N/A` AND `Contact.Recruiter == N/A`.
