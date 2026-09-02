<script lang="ts">
	import { confirmSuccess, internal } from "$lib/nav/internal";
	import { onMount } from "svelte";

	interface Props {
		settings: Settings;
	}
	let { settings = $bindable() }: Props = $props();

    async function saveSettings () {
        confirmSuccess(internal.post('settings', settings, {}, 'patch'))
    }

	onMount(() => {
		setTimeout(async () => {
			const response = await internal.get('settings')
			if (response.settings) settings = response.settings;
		}, 1000)
	})
</script>

<div class="mb-4">
    <h1 class="fs-5 fw-semibold mb-1">Google Sheets — Integration</h1>
    <p class="text-muted" style="font-size:13px;">Connect a spreadsheet so the data is visible to the entire EISG team.</p>
</div>
<div class="form-card">
    <div class="form-card-title">Connection Configuration</div>
    <div class="row g-3">
        <div class="col-12">
            <label class="field-label" for="s-id">Spreadsheet ID</label>
            <input id="s-id" type="text" class="form-control" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" bind:value={settings.sheetsId} />
            <div class="hint">From URL: docs.google.com/spreadsheets/d/<strong>[THIS_ID]</strong>/edit</div>
        </div>
        <div class="col-12">
            <label class="field-label" for="s-key">API Key</label>
            <input id="s-key" type="password" class="form-control" placeholder="AIza..." bind:value={settings.sheetsKey} />
        </div>
    </div>
    <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-eisg-primary" onclick={saveSettings}>Save configuration</button>
    </div>
</div>
<div class="form-card">
    <div class="form-card-title">Setup Instructions</div>
    <ol style="color:#4a6072;font-size:13px;line-height:2.2;padding-left:18px;">
        <li>Create a new Google Sheets spreadsheet and copy the ID from the URL</li>
        <li>Google Cloud Console → New Project → enable <strong>Google Sheets API</strong></li>
        <li>APIs &amp; Services → Credentials → <strong>Create API Key</strong></li>
        <li>Restrict the key to the Sheets API and allowed domains</li>
        <li>Share the spreadsheet: <em>anyone with the link can edit</em></li>
        <li>Paste the Spreadsheet ID and API Key above</li>
    </ol>
</div>