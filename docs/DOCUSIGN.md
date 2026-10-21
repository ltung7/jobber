# DocuSign Integration Plan (Updated)

## 1. Environment & Setup
- **Environment Variables:** `.env` will provide `DS_CLIENT_ID`, `DS_USER_ID`, `DS_ACCOUNT_ID`, and necessary keys utilized in the imported `docusign.token.ts`.
- **Database Architecture:**
  - Create `src/lib/server/db/firebase/contract.fdb.ts` based on `template.fdb.ts` for managing plain-text contract templates.
  - Create `src/lib/server/db/firebase/envelope.fdb.ts` (representing "sent contracts") for tracking dispatched envelopes.

## 2. Contract Management (CRUD) & Templates
- **Frontend Page (`/contracts`):**
  - List, view, edit, and send contracts.
  - **Bilingual Support (PL/EN):** Templates support dual-language versions (PL/EN) to accommodate foreign recommenders (e.g., workers from Nepal). The template editor/viewer allows selecting or maintaining both language versions.
  - **Creation:** Users paste plain text to generate contracts. Paragraph marks will act as section separators.
  - The core contract body has no placeholders – dynamic data (names, dates, etc.) is **not** embedded in the template.

## 3. PDF Generation
- **Client-Side Generation:** Reusing the project's existing browser-based approach (`jspdf` and `html2canvas`, as seen in `OfferPreviewModal.svelte`) to convert HTML into a Base64 PDF before POSTing it to the server.
- **Generic Text Injection:** Just before PDF generation, automatically prepend generic header text (e.g., contract details, parties) to the plaintext body.
- **Signature Anchors:** Add hidden or white text at the bottom of the generated HTML (e.g., `\s1\` and `\s2\`) so DocuSign can anchor signature tabs.

## 4. DocuSign Sending Flow & Recommender Details
- **Modal UI:** Create/Open a modal based on `src/lib/misc/ClosableModal.svelte` when "Send to DocuSign" is clicked.
- **Modal Fields (Party 2 / Receiver - Recommender):**
  - **Full Name, Phone, and Email** (Note: Some recommenders might not have or check emails frequently).
  - **Bank Account Number** OR **Cash ("Gotówka") selection option**.
  - **Bitrix Contact Link:** Recommender's Bitrix Contact ID to track who they recommended.
- **SMS Delivery Support:**
  - DocuSign fully supports sending signing links via SMS using `deliveryMethod: "SMS"` or `additionalNotifications` (SMS delivery) with `phoneNumber` (`countryCode` and `number`). 
  - If an email is absent or optional, configure the recipient object with `deliveryMethod: "SMS"` and their phone number.
- **Submission:** Client generates the PDF in base64, attaches the modal form data, and posts to the server.

## 5. Backend Integration & Data Storage
- **DocuSign Service (`src/lib/server/services/docusign/docusign.service.ts`):** 
  - Refactor `signTabPage` to use `anchorString` instead of absolute coordinates (e.g., `\s1\` and `\s2\`).
  - Configure SMS recipient delivery (`deliveryMethod: "SMS"` / `phoneNumber`) when phone-based delivery is requested.
  - Add CC recipients functionality to `sendEnvelope`.
- **Storage (`envelope.fdb.ts`):**
  - Track envelope dispatch: original contract ID, DocuSign Envelope ID, sender/receiver info, Bitrix Contact ID, bank account / cash choice, status, and plaintext version. Do NOT save the base64 PDF.

## 6. Webhooks, Bitrix Synchronization & Monitoring
- **Webhook Service (`src/lib/server/services/docusign/docusignWebhook.service.ts`):**
  - Catch `envelope-completed` (and other status events).
  - Extract the envelope ID or custom tracking fields.
  - **Bitrix Synchronization:** When an envelope reaches the **"Signed" ("podpisana")** status, automatically update/record this status on the **Recommender's Contact in Bitrix** (using the stored Bitrix Contact ID). This makes it immediately visible for payout tracking (e.g. 150 PLN payout after 30 days).
  - Update `envelope.fdb.ts` with the new status.
- **Recruiter / Contact Link & Selection:**
  - When filling contact/envelope signer details, include a **Recruiter** selection field using `@src/lib/misc/CustomFormSelect.svelte`.
  - Available options: **"none"**, **"create new"** (based on contact name — automatically created via webhook/server when the envelope is sent if it does not already exist in Bitrix), or select one of the existing recruiters.
  - Save sent envelope recipients/contracts to Firebase `.fdb` files (e.g., `envelope.fdb.ts`), binding them to the selected Recruiter ID and Bitrix Contact ID.
- **View/Resend:** 
  - `/contracts` page will show envelope status.
  - Include manual polling button (calls DocuSign API and updates FDB).
  - Include functionality to resend envelope.
