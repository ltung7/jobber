# Instructions to Add a New Language (Locale)

You are an AI agent. Please follow these tasks in succession to add a new language (using its 2-letter ISO language code, e.g., `es`) to the project.

### 1. Update the `Lang` type
- **File:** `src/app.d.ts`
- **Task:** Find the `Lang` type definition (e.g., `type Lang = 'en' | 'pl' | ...`) and append the new 2-letter ISO language code to the union.

### 2. Create the Translation File
- **Directory:** `src/lib/assets/messages/`
- **Task:** 
  1. Create a new file named `[locale].json` (e.g., `es.json`).
  2. Read the contents of `src/lib/assets/messages/en.json`.
  3. Copy its structure and translate all the values into the new language, keeping the keys identical.

### 3. Link the Translation File
- **File:** `src/lib/assets/messages/index.ts`
- **Task:** 
  1. Import the new JSON file at the top of the file alongside the others (e.g., `import es from './es.json'`).
  2. Add the imported object to the `T_LABELS` record export at the bottom of the file.

### 4. Update Application Constants
- **File:** `src/lib/components/const.ts`
- **Task:** 
  1. Find the `TRANSLATE_LANGS` array and add the new 2-letter locale code to it.
  2. Find the `LANGUAGES` object and add a new entry for the locale.
  3. **Flag & Country Code:** Determine the country with the most native speakers of this language and use its 2-letter ISO country code for the flag image URL (`https://storage.googleapis.com/feed-cdn-files/flags/[country_code].svg`). Note: The language code and country code might differ (e.g., Hindi language `hi` uses India flag `in.svg`).
  4. **Language Name:** Use the native name of the language (e.g., "Español" for Spanish, "Deutsch" for German) for the `alt` attribute, the `title` attribute, and the caption text.
  5. Use the existing format:
     ```javascript
     [locale]: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/[country_code].svg" alt="[Native Name]" title="[Native Name]" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> [Native Name]'
     ```