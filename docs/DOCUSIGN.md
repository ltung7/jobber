# DocuSign Integration Plan (Updated)

## 1. Environment & Setup
- [x] **Environment Variables:** `.env` provides `DS_CLIENT_ID`, `DS_USER_ID`, `DS_ACCOUNT_ID`, and necessary keys utilized in the imported `docusign.token.ts`.
- [x] **Database Architecture:**
  - Created `src/lib/server/db/firebase/contract.fdb.ts` based on `template.fdb.ts` for managing plain-text contract templates.
  - Created `src/lib/server/db/firebase/envelope.fdb.ts` (representing "sent contracts") for tracking dispatched envelopes.

## 2. Contract Management (CRUD) & Templates
- [x] **Frontend Page (`/contracts`):**
  - List, view, edit, and send contracts.
  - **Bilingual Support (PL/EN):** Templates support dual-language versions (PL/EN) to accommodate foreign recommenders (e.g., workers from Nepal). The template editor/viewer allows selecting or maintaining both language versions.
  - **Creation:** Users paste plain text to generate contracts. Paragraph marks act as section separators.
  - The core contract body has no placeholders – dynamic data (names, dates, etc.) is **not** embedded in the template.

## 3. PDF Generation
- [x] **Client-Side Generation:** Reusing the project's existing browser-based approach (`jspdf` and `html2canvas`, as seen in `OfferPreviewModal.svelte`) to convert HTML into a Base64 PDF before POSTing it to the server.
- [x] **Generic Text Injection:** Just before PDF generation, automatically prepend generic header text (e.g., contract details, parties) to the plaintext body.
- [x] **Signature Anchors:** Add hidden or white text at the bottom of the generated HTML (e.g., `\s1\` and `\s2\`) so DocuSign can anchor signature tabs.

## 4. DocuSign Sending Flow & Recommender Details
- [x] **Modal UI:** Created/Opened modal based on `src/lib/misc/ClosableModal.svelte` when "Send to DocuSign" is clicked (`SendContractModal.svelte`).
- [x] **Modal Fields (Party 2 / Receiver - Recommender):**
  - **Full Name, Phone, and Email** (handles optional/absent email).
  - **Bank Account Number** OR **Cash ("Gotówka") selection option**.
  - **Bitrix Contact Link:** Removed to decouple contractees from CRM contact records in favor of Bitrix custom enumeration options.
- [x] **SMS Delivery Support:**
  - DocuSign fully supports sending signing links via SMS using `deliveryMethod: "SMS"` or `additionalNotifications` (SMS delivery) with `phoneNumber` (`countryCode` and `number`). 
  - If an email is absent or optional, configures the recipient object with `deliveryMethod: "SMS"` and their phone number.
- [x] **Submission:** Client generates the PDF in base64, attaches the modal form data, and posts to the server.

## 5. Backend Integration & Data Storage
- [x] **DocuSign Service (`src/lib/server/services/docusign/docusign.service.ts`):** 
  - Refactored `signTabPage` to use `anchorString` instead of absolute coordinates (e.g., `\s1\` and `\s2\`).
  - Configured SMS recipient delivery (`deliveryMethod: "SMS"` / `phoneNumber`) when phone-based delivery is requested.
  - Added CC recipients functionality to `sendEnvelope`.
  - Added `getEnvelopeStatus(envelopeId)` and `resendEnvelope(envelopeId)`.
- [x] **Storage (`envelope.fdb.ts`):**
  - Track envelope dispatch: original contract ID, DocuSign Envelope ID, sender/receiver info, Bitrix Contact ID, bank account / cash choice, status, and plaintext version. Does NOT save the base64 PDF.

## 6. Webhooks, Bitrix Synchronization & Monitoring
- [x] **Webhook Service (`src/lib/server/services/docusign/docusignWebhook.service.ts`):**
  - Catch `envelope-completed` (and other status events).
  - Extract the envelope ID or custom tracking fields.
  - **Bitrix Synchronization:** When an envelope reaches the **"Signed" ("podpisana")** status, automatically updates/records this status on the **Recommender's Contact in Bitrix** (using the stored Bitrix Contact ID). This makes it immediately visible for payout tracking (e.g. 150 PLN payout after 30 days).
  - Updates `envelope.fdb.ts` with the new status.
- [x] **Recruiter / Contact Link & Selection:**
  - When filling contact/envelope signer details, includes a **Recruiter** selection field using `@src/lib/misc/CustomFormSelect.svelte`.
  - Available options: **"none"**, **"create new"** (based on contact name — automatically created via webhook/server when the envelope is sent if it does not already exist in Bitrix), or select one of the existing recruiters.
  - Saves sent envelope recipients/contracts to Firebase `.fdb` files (`envelope.fdb.ts`), binding them to the selected Recruiter ID and Bitrix Contact ID.
- [x] **View/Resend:** 
  - `/contracts` page shows envelope status.
  - Includes manual polling button (calls DocuSign API and updates FDB).
  - Includes functionality to resend envelope.

---

## 7. Phase 2: Bitrix Recruiter Enumeration, Contractor & Contractee Databases, NIP Lookup & Envelope Linking

### Context & Architecture Decisions

1. **Recruiter is a Bitrix Userfield Enumeration Item (Not a Contact):**
   - In Bitrix24, **Recruiter** (`UF_CRM_1790672831151`) is a custom `enumeration` field on the Contact entity, **not** a CRM Contact record.
   - Creating a new recruiter (`recruiterId === 'create_new'`) must **never** call `crm.contact.add`. Instead, `BitrixService` (`src/lib/bitrix/bitrix.service.ts`) will query the custom field definition via `crm.contact.userfield.list` (filtering by `FIELD_NAME: 'UF_CRM_1790672831151'`), preserve all existing `LIST` entries (`{ ID, VALUE, SORT, DEF }`), append `{ VALUE: newRecruiterName }`, and update the field via `crm.contact.userfield.update`. It then re-fetches the userfield `LIST` to return the newly generated enumeration item `ID`.

2. **Contractor Database (`src/lib/server/db/firebase/recruiterContractor.fdb.ts`) & Polish NIP Lookup:**
   - Represents **Party 1 (Principal / Company)** on contracts stored in Firestore collection `recruiterContractors`.
   - Default fallback/seeded record is **EISG Sp. z o.o.** (`nip: "5252637218"`, `krs: "0000588661"`, `address: "ul. Złota 59, 00-120 Warszawa"`, `email: "biuro@eisg.pl"`, `isDefault: true`).
   - "Represented by" field has been removed to simplify party declarations.
   - **NIP Auto-Download:** A server endpoint (`GET /contracts/api/nip?nip=<10-digits>`) queries the Polish Ministry of Finance White List REST API (`https://wl-api.mf.gov.pl/api/search/nip/{nip}?date=YYYY-MM-DD`) and normalizes `result.subject` into `{ name, nip, regon, krs, address, bankAccounts }` so the Contractor form auto-populates company details from NIP.
   - **Interface Contract (`recruiterContractor.fdb.ts`):**
     ```ts
     export interface Contractor {
     	id?: string;
     	name: string;
     	nip: string;
     	regon?: string;
     	krs?: string;
     	address: string;
     	email: string;
     	phone?: string;
     	isDefault?: boolean;
     	createdAt?: string;
     	updatedAt?: string;
     }
     ```

3. **Contractee Database (`src/lib/server/db/firebase/recruiterContractee.fdb.ts`):**
   - Represents **Party 2 (Recommender / Signer)** stored in Firestore collection `recruiterContractees` with an assigned Bitrix Recruiter enumeration ID (`recruiterId`).
   - Allows managing a persistent directory of contractees (recommenders), linking each to their Bitrix Contact ID (optional) and their assigned Bitrix Recruiter enum ID (`UF_CRM_1790672831151`), and quickly selecting or creating them during contract dispatch.
   - Contact info (phone number and email) is intentionally **excluded** from the rendered PDF document parties block (only Name and Payout Method / Bank Account are rendered).
   - **Interface Contract (`recruiterContractee.fdb.ts`):**
     ```ts
     export interface Contractee {
     	id?: string;
     	name: string;
     	phone?: string;
     	email?: string;
     	deliveryMethod?: 'email' | 'SMS';
     	paymentMethod?: 'bank' | 'cash';
     	bankAccount?: string;
     	recruiterId: string; // Bitrix UF_CRM_1790672831151 enumeration item ID
     	recruiterName?: string;
     	bitrixContactId?: string | number;
     	createdAt?: string;
     	updatedAt?: string;
     }
     ```

4. **Linking Recruiter, Contractor & Contractee to Envelopes (`src/lib/server/db/firebase/recruiterEnvelope.fdb.ts`):**
   - Stored in Firestore collection `recruiterEnvelopes`.
   - Extend `SentEnvelope` with:
     - `contractorId?: string;` (links to `recruiterContractors` FDB document)
     - `contractorNip?: string;`
     - `contracteeId?: string;` (links to `recruiterContractees` FDB document)
     - `recruiterId?: string;` (normalized string ID from Bitrix `UF_CRM_1790672831151` enumeration list)
     - `recruiterName?: string;`
   - Add dedicated query functions in `recruiterEnvelope.fdb.ts`:
     - `findEnvelopesByRecruiterId(recruiterId: string): Promise<SentEnvelope[]>`
     - `findEnvelopesByContracteeId(contracteeId: string): Promise<SentEnvelope[]>`
   - This enables deterministic lookup of every contract a given Recruiter / Contractee has **signed** (`status === 'completed' || status === 'signed'`) or **not signed** (`sent`, `delivered`, `in-progress`, `declined`, `voided`, or `none` if no envelope has been dispatched yet).

5. **Recruiter Prefix on all FDB Files & Collections:**
   - All recruiter-related Firestore files and collections use the `recruiter` prefix:
     - `recruiterContract.fdb.ts` (`recruiterContracts` collection)
     - `recruiterContractor.fdb.ts` (`recruiterContractors` collection)
     - `recruiterContractee.fdb.ts` (`recruiterContractees` collection)
     - `recruiterEnvelope.fdb.ts` (`recruiterEnvelopes` collection)
     - `recruiterPayout.fdb.ts` (`recruiterPayouts` collection)

6. **Bilingual PDF Document Renderer & Contracts List Preview:**
   - All contracts are strictly **bilingual** (no single-language toggle).
   - Rendered in **two bordered columns side-by-side** (Polish on the left, English on the right) for the header parties and each section (§).
   - Generous signature space (`margin-top: 90px; min-height: 100px;`) with signature anchor tags `\s1\` and `\s2\`.
   - Reusable `ContractPdfPreviewModal.svelte` accessible directly from the contract templates list to view/open/print bilingual PDFs without initiating a DocuSign dispatch.

---

### Affected Files

- **Create:**
  - `src/lib/server/db/firebase/contractor.fdb.ts` — Firestore CRUD for `contractors` collection + default EISG seeding helper.
  - `src/lib/server/db/firebase/contractee.fdb.ts` — Firestore CRUD for `contractees` collection + lookup by `recruiterId`.
  - `src/routes/contracts/api/nip/+server.ts` — `GET` endpoint querying `https://wl-api.mf.gov.pl/api/search/nip/{nip}?date=YYYY-MM-DD` to fetch company data by Polish NIP.
  - `src/routes/contracts/api/contractors/+server.ts` — `GET`, `POST`, `DELETE` API endpoints for managing `Contractor` records.
  - `src/routes/contracts/api/contractees/+server.ts` — `GET`, `POST`, `DELETE` API endpoints for managing `Contractee` records (including creating a new Bitrix Recruiter enum item when `recruiterId === 'create_new'`).
  - `src/routes/contracts/ContractorModal.svelte` — Modal form to add/edit a Contractor company with a "Fetch by NIP" lookup action.
  - `src/routes/contracts/ContracteeModal.svelte` — Modal form to add/edit a Contractee contact with Recruiter enumeration assignment (`CustomFormSelect`), payment details, and optional Bitrix Contact search.
- **Edit:**
  - `src/lib/bitrix/bitrix.service.ts` — Add `getRecruiterEnumField()` and `addRecruiterEnumOption(value: string): Promise<{ id: string; value: string }>` using `crm.contact.userfield.list` and `crm.contact.userfield.update` on `UF_CRM_1790672831151`.
  - `src/lib/server/db/firebase/envelope.fdb.ts` — Add `contractorId`, `contractorNip`, `contracteeId` to `SentEnvelope`, and implement `findEnvelopesByRecruiterId` and `findEnvelopesByContracteeId`.
  - `src/routes/contracts/api/envelopes/+server.ts` — Replace the erroneous `bitrixService.addContact` when `recruiterId === 'create_new'` with `bitrixService.addRecruiterEnumOption(receiver.name)`, upsert/link the `Contractee` and `Contractor` records, and support `?recruiterId=...` and `?contracteeId=...` query parameters in `GET`.
  - `src/routes/contracts/+page.server.ts` — Load `contractors` (seeding default EISG if empty) and `contractees` alongside `contracts`, `envelopes`, and `recruiterOptions`.
  - `src/routes/contracts/SendContractModal.svelte` — Allow selecting a `Contractor` (defaulting to EISG) and selecting/auto-filling from an existing `Contractee` (or saving as a new `Contractee`), dynamically rendering the selected `Contractor` company details in the PDF header and party signature block.
  - `src/routes/contracts/+page.svelte` — Add navigation views/tabs and management tables for **Contractors (Companies)** and **Contractees (Recommenders)**, displaying each person's linked `recruiterId` and their live envelope signing status (**Signed**, **Pending/Unsigned**, or **No Contract Sent**) with quick filter by Recruiter.

---

### Task Checklist

#### 1. Bitrix Recruiter Enumeration List Service
- [x] In `src/lib/bitrix/bitrix.service.ts`, implement `getUserfieldByName(fieldName: string)` calling `crm.contact.userfield.list` with `filter: { FIELD_NAME: fieldName }`.
- [x] In `src/lib/bitrix/bitrix.service.ts`, implement `addRecruiterEnumOption(recruiterName: string, fieldName = 'UF_CRM_1790672831151'): Promise<{ id: string; value: string }>` that:
  - Checks if an enum item with the same case-insensitive `VALUE` already exists in `LIST` and returns its `ID` if found.
  - Otherwise calls `crm.contact.userfield.update` passing `id: userfield.ID` and `fields: { LIST: [...existingList, { VALUE: recruiterName.trim() }] }`.
  - Re-fetches the userfield `LIST` to locate and return the newly assigned enum `{ id, value }`.

#### 2. Contractor FDB & Polish NIP Auto-Download
- [x] Create `src/lib/server/db/firebase/contractor.fdb.ts` with `Contractor` interface and CRUD helpers (`addContractor`, `setContractor`, `getContractor`, `findContractors`, `deleteContractor`, `ensureDefaultContractor` for `EISG Sp. z o.o.`, NIP `5252637218`, KRS `0000588661`).
- [x] Create `src/routes/contracts/api/nip/+server.ts` (`GET`):
  - Strip non-digits and validate the 10-digit Polish NIP checksum.
  - Fetch `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${dayjs().format('YYYY-MM-DD')}`.
  - Map `result.subject` fields (`name`, `nip`, `regon`, `krs`, `workingAddress || residenceAddress`, `representatives`) and return JSON `{ success: true, company: { ... } }`.
- [x] Create `src/routes/contracts/api/contractors/+server.ts` (`GET`, `POST`, `DELETE`) to list, create/update (handling `isDefault` toggling), and delete contractors.

#### 3. Contractee FDB & Recruiter-Envelope Linking
- [x] Create `src/lib/server/db/firebase/contractee.fdb.ts` with `Contractee` interface and CRUD helpers (`addContractee`, `setContractee`, `getContractee`, `findContractees`, `findContracteesByRecruiterId`, `deleteContractee`).
- [x] Create `src/routes/contracts/api/contractees/+server.ts` (`GET`, `POST`, `DELETE`):
  - On `POST`, if `recruiterId === 'create_new'`, invoke `bitrixService.addRecruiterEnumOption(newRecruiterName || name)` and store the resulting enumeration `id` and `value` (`recruiterId`, `recruiterName`) on the `Contractee` document.
  - If `bitrixContactId` is provided alongside a valid `recruiterId`, update the Bitrix Contact's `UF_CRM_1790672831151` field via `bitrixService.updateContact`.
- [x] Update `src/lib/server/db/firebase/envelope.fdb.ts`:
  - Add `contractorId?: string`, `contractorNip?: string`, and `contracteeId?: string` to `SentEnvelope`.
  - Add `findEnvelopesByRecruiterId(recruiterId: string)` and `findEnvelopesByContracteeId(contracteeId: string)` query functions.
- [x] Update `src/routes/contracts/api/envelopes/+server.ts`:
  - In `GET`, support optional `?recruiterId=` and `?contracteeId=` query parameters to return all envelopes (signed and unsigned) for a specific recruiter or contractee.
  - In `POST`, remove the logic that creates a Bitrix Contact when `recruiterId === 'create_new'`; instead call `bitrixService.addRecruiterEnumOption(receiver.name)` to create the enum entry in `UF_CRM_1790672831151`.
  - Upsert or link the `Contractee` record in `contractee.fdb.ts` and store `contractorId`, `contracteeId`, `recruiterId`, and `recruiterName` on the saved `SentEnvelope`.
- [x] Create `src/routes/contracts/api/contacts/+server.ts`:
  - Provide Bitrix contact search strictly within the `/contracts/api/contacts` path.

#### 4. Frontend Forms & Dashboard Views (`/contracts`)
- [x] Create `src/routes/contracts/ContractorModal.svelte`:
  - Form inputs for NIP (with "Download by NIP" button calling `/contracts/api/nip?nip=...`), Company Name, Address, KRS, REGON, Representative, Email, Phone, and "Set as Default Contractor" checkbox.
- [x] Create `src/routes/contracts/ContracteeModal.svelte`:
  - Form inputs for Full Name, Phone, Email, Delivery Method (`SMS` / `email`), Payment Method (`bank` / `cash`), Bank Account, Bitrix Contact search (`/contracts/api/contacts`), and Recruiter enumeration selector (`CustomFormSelect` with `"create_new"` option to add to the Bitrix list).
- [x] Update `src/routes/contracts/SendContractModal.svelte`:
  - Add Contractor selector at the top of Party 1 (pre-selected to the default Contractor, e.g., `EISG Sp. z o.o.`) and inject the selected Contractor's `name`, `address`, `nip`, `krs`, and `representative` into the generated PDF header and plaintext output.
  - Add Contractee selector in Party 2 so users can pick a saved Contractee (auto-populating name, phone, email, delivery method, payment method, bank account, Bitrix Contact ID, and `recruiterId`) or fill in a new one.
- [x] Update `src/routes/contracts/+page.server.ts` and `src/routes/contracts/+page.svelte`:
  - Load `contractors` and `contractees` in `+page.server.ts`.
  - Add sidebar navigation items and views in `+page.svelte` for **Contractees** and **Contractors (Companies)** alongside Templates and Envelopes.
  - In the **Contractees** and **Envelopes** views, display each person's assigned Recruiter (`recruiterName` / `#recruiterId`) and a summary of all envelopes linked to that `recruiterId` / `contracteeId` (showing counts and badges for **Signed** vs **Unsigned/Pending** contracts, plus ability to filter envelopes by Recruiter).

---

## 8. Phase 3: DocuSign Delivery, Robust PDF Parsing, Dynamic Coordinates & Testing Box Mode

### Context & Implementation Summary
1. **Concise Axios Error Handling:**
   - Identified that `dsError` is an Axios error from the DocuSign client / SDK.
   - Refactored `sendEnvelope` in `src/lib/server/services/docusign/docusign.service.ts` to call `thrower.axios(err, 'DocuSignCreateEnvelope')`.
   - Updated `src/routes/contracts/api/envelopes/+server.ts` to leverage `thrower.endpoint(dsErr, 500, true)` so concise, readable error messages are returned and logged instead of dumping massive Axios request/response objects.

2. **Base64 PDF Prefix Sanitization:**
   - Fixed an issue where data URIs containing attributes such as `data:application/pdf;filename=generated.pdf;base64,...` caused regex replacements to fail and produced invalid tiny buffers (20 bytes).
   - Resolved by splitting payloads cleanly on `,` (`pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64`) before instantiating `Buffer.from(..., 'base64')`.

3. **Firestore `undefined` Value Prevention:**
   - Stripped all explicit `undefined` fields from `envelopeData` (`contractId`, `contractorId`, `contractorNip`, `contracteeId`, `bankAccount`, `recruiterId`, `recruiterName`) to prevent Firebase Firestore rejection errors.

4. **Sequential vs Concurrent Signer Delivery:**
   - Clarified DocuSign routing order behavior (`routingOrder: '1'` vs `'2'`) where the second recipient only receives an email after the first completes signing.

5. **Webhook Isolation & XML/JSON Dual-Mode Parsing:**
   - Added per-envelope `eventNotification` pointing to `https://manager.eisg.pl/api/docusign/webhook` (with SIM JSON v2.1 event data format) so this service's webhooks remain isolated from other services sharing the same DocuSign account.
   - Added robust XML fallback and `fast-xml-parser` support in `src/routes/api/docusign/webhook/+server.ts` to prevent `SyntaxError` crashes on incoming DocuSign XML Connect messages.
   - Integrated automatic Slack notifications (`slackMessage`) whenever a DocuSign webhook is received.

6. **Canvas PDF Anchor Search Limitations & Coordinate-Based Signing:**
   - Diagnosed why DocuSign anchors (`\s1\`, `\s2\`) allowed recipients to "sign anywhere": because `html2canvas` rasterizes text into JPEG/PNG image slices, DocuSign's OCR/text-search engine could not find the text strings in the PDF stream.
   - Switched from text-anchor tabs to coordinate-based tabs (`useAnchor: false`).
   - Sourced dynamic page-relative coordinates (`leftCoords`, `rightCoords`) calculated from the actual rendered positions of signature DOM nodes (`#anchor-s1`, `#anchor-s2`) on the final page (`doc.getNumberOfPages()`), taking into account dynamic text flow and length differences across contracts.
   - Adjusted coordinates to align signature boxes right on top of the signature lines.

7. **Local Manual Testing Box Renderer (`SIGN_TEST`):**
   - Implemented `SIGN_TEST = false && isDev` in `docusign.service.ts` with `pdf-lib`.
   - When active, draws visual bounding boxes representing the exact coordinates for the left and right signer onto the target page of `/tmp/contract.pdf` for verification before live envelope dispatch.

8. **Custom Sender / Reply-To Override:**
   - Added `emailSettings` with `replyEmailAddressOverride` and `replyEmailNameOverride` in `sendEnvelope` so sent envelopes reflect the correct Contractor company sender info instead of default demo account details.

---

### Summary of Remaining Steps
- **Testing & Verification:**
  - **Bitrix Integration Testing:** Verify that selecting **"create new"** for a Recruiter correctly appends the new option to the Bitrix Contact custom enumeration field (`UF_CRM_1790672831151`) via `bitrixService.addRecruiterEnumOption` and assigns the new ID to the dispatched envelope/contractee without creating duplicate CRM contact records.
- **Optional Extensions:**
  - Add periodic automated polling cron or scheduled check for pending DocuSign envelopes if webhook delivery fails on specific server environments.
  - Expand notification templates (e.g. email/SMS alerts to recommenders upon signature completion).
