import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		ignores: [
			'eslint.config.js',
			'svelte.config.js',
			'**/*.json',
		]
	},
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			"@typescript-eslint/no-explicit-any": 'off',
			"@typescript-eslint/no-unused-vars": 'warn',
			"@typescript-eslint/no-unused-expressions": "off",
			"no-dupe-keys": "error",
    		"@typescript-eslint/no-redeclare": "error",
			'svelte/require-each-key': 'off',
			'svelte/no-at-html-tags': 'off',
			"svelte/require-event-dispatcher-types": "off",
			"svelte/no-raw-special-elements": "off",
			"array-bracket-spacing": [ "error", "always" ],
			"object-curly-spacing": [ "error", "always" ],
			"svelte/state-referenced-locally": "off",
			"state-referenced-locally": "off",
			"no-unused-vars": "off"
		}
	},
	{
		files: [ '**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js' ],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [ '.svelte' ],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [ "warn", {
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"caughtErrorsIgnorePattern": "^_"
			} ],
			"svelte/no-navigation-without-resolve": "off",
			"no-unused-vars": "off",
			"state-referenced-locally": "off",
			"svelte/state-referenced-locally": "off",
			'a11y_consider_explicit_label': 'off'
		}
	},
	{
		files: [ '**/*.ts', '**/*.tsx', '**/*.d.ts' ],
		rules: {
			"@typescript-eslint/no-unused-vars": [ "warn", {
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"caughtErrorsIgnorePattern": "^_"
			} ],
			"no-unused-vars": "off"
		}
	},
	{
		files: [ '**/*.d.ts' ],
		rules: {
			"@typescript-eslint/no-unused-vars": "warn",
			"no-dupe-keys": "error"
		}
	}
);
