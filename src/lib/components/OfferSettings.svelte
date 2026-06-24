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
	<h1 class="fs-5 fw-semibold mb-1">Google Sheets — integracja</h1>
	<p class="text-muted" style="font-size:13px;">Podłącz arkusz aby dane były widoczne dla całego zespołu EISG.</p>
</div>
<div class="form-card">
	<div class="form-card-title">Konfiguracja połączenia</div>
	<div class="row g-3">
		<div class="col-12">
			<label class="field-label" for="s-id">Spreadsheet ID</label>
			<input id="s-id" type="text" class="form-control" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" bind:value={settings.sheetsId} />
			<div class="hint">Z URL: docs.google.com/spreadsheets/d/<strong>[TEN_ID]</strong>/edit</div>
		</div>
		<div class="col-12">
			<label class="field-label" for="s-key">API Key</label>
			<input id="s-key" type="password" class="form-control" placeholder="AIza..." bind:value={settings.sheetsKey} />
		</div>
	</div>
	<div class="d-flex justify-content-end mt-3">
		<button class="btn btn-eisg-primary" onclick={saveSettings}>Zapisz konfigurację</button>
	</div>
</div>
<div class="form-card">
	<div class="form-card-title">Instrukcja konfiguracji</div>
	<ol style="color:#4a6072;font-size:13px;line-height:2.2;padding-left:18px;">
		<li>Utwórz nowy arkusz Google Sheets i skopiuj ID z URL</li>
		<li>Google Cloud Console → Nowy projekt → włącz <strong>Google Sheets API</strong></li>
		<li>APIs &amp; Services → Credentials → <strong>Create API Key</strong></li>
		<li>Ogranicz klucz do Sheets API i dozwolonych domen</li>
		<li>Udostępnij arkusz: <em>każdy z linkiem może edytować</em></li>
		<li>Wklej Spreadsheet ID i API Key powyżej</li>
	</ol>
</div>
