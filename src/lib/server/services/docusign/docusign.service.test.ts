import { describe, it, expect } from 'vitest';
import { signTabPage } from './docusign.service';

describe('docusign.service', () => {
	it('generates anchor tabs with anchorString', () => {
		const tab = signTabPage('\\s1\\');
		expect(tab.signHereTabs).toBeDefined();
		expect(tab.signHereTabs?.[0].anchorString).toBe('\\s1\\');
		expect(tab.signHereTabs?.[0].anchorUnits).toBe('pixels');
	});

	it('generates coordinate tabs when page number is passed', () => {
		const leftTab = signTabPage(2, true);
		expect(leftTab.signHereTabs).toBeDefined();
		expect(leftTab.signHereTabs?.[0].pageNumber).toBe('2');
		expect(leftTab.signHereTabs?.[0].xPosition).toBe('120');

		const rightTab = signTabPage(2, false);
		expect(rightTab.signHereTabs?.[0].xPosition).toBe('400');
	});
});
