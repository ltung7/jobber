---
name: Add Language
description: Add a new language (locale) to the project's translation system. Use when the user asks to add, enable, or support a new language/locale, or mentions adding a translation. Triggers on "add language", "add locale", "new language", "translate to X", or a 2-letter ISO language code (e.g. es, de, it).
---

# Add a New Language (Locale)

Add a new language (using its 2-letter ISO language code, e.g. `es`) to the project.

## Steps

### 1. Update the `Lang` type

- **File:** `src/app.d.ts`
- Find the `Lang` type definition (e.g. `type Lang = 'en' | 'pl' | ...`) and append the new 2-letter ISO language code to the union.

### 2. Create the Translation File

- **Directory:** `src/lib/assets/messages/`
- Create a new file named `[locale].json` (e.g. `es.json`).
- Read the contents of `src/lib/assets/messages/en.json`.
- Copy its structure and translate all the values into the new language, keeping the keys identical.

### 3. Link the Translation File

- **File:** `src/lib/assets/messages/index.ts`
- Import the new JSON file at the top of the file alongside the others (e.g. `import es from './es.json'`).
- Add the imported object to the `T_LABELS` record export at the bottom of the file.

### 4. Update Application Constants

- **File:** `src/lib/components/const.ts`
- Find the `TRANSLATE_LANGS` array and add the new 2-letter locale code to it.
- Find the `LANGUAGES` object and add a new entry for the locale.
- **Flag & Country Code:** Determine the country with the most native speakers of this language and use its 2-letter ISO country code for the flag image URL (`https://storage.googleapis.com/feed-cdn-files/flags/[country_code].svg`). Note: the language code and country code might differ (e.g. Hindi language `hi` uses India flag `in.svg`).
- **Language Name:** Use the native name of the language (e.g. "Español" for Spanish, "Deutsch" for German) for the `alt` attribute, the `title` attribute, and the caption text.
- Use the existing format:

```javascript
[locale]: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/[country_code].svg" alt="[Native Name]" title="[Native Name]" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> [Native Name]'
```

## Verification

- `src/lib/assets/messages/[locale].json` parses as JSON and has the same keys as `en.json`.
- `src/app.d.ts` `Lang` union includes the new code.
- `src/lib/assets/messages/index.ts` imports the new file and includes it in `T_LABELS`.
- `src/lib/components/const.ts` `TRANSLATE_LANGS` and `LANGUAGES` include the new locale.
- Run `npm run check` (or the project's type-check) to confirm no type errors.
