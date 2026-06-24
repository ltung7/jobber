<script lang="ts">
	import UIcon from "$lib/misc/UIcon.svelte";

	interface Props {
		archivedOffers: ArchiveEntry[];
		deleteArchive: (id: string) => void;
	}
	let { archivedOffers, deleteArchive }: Props = $props();
</script>

<div class="mb-4">
	<h1 class="fs-5 fw-semibold mb-1">Archiwum PDF</h1>
	<p class="text-muted" style="font-size:13px;">Historia wygenerowanych plików PDF.</p>
</div>
<div class="form-card" style="padding:0;overflow:hidden;">
	{#if archivedOffers.length === 0}
		<div class="empty-state">
			<UIcon name="box" size={1} />
			<p>Brak wygenerowanych PDF.<br />Wygeneruj pierwszą ofertę.</p>
		</div>
	{:else}
		<table class="data-table">
			<thead
				><tr>
					<th>Nr oferty</th><th>Stanowisko</th><th>Lokalizacja</th><th>Stawka</th><th>Języki</th><th>Data wygenerowania</th><th></th>
				</tr></thead
			>
			<tbody>
				{#each archivedOffers as entry (entry.id)}
					<tr>
						<td style="color:#4a6072;font-size:12px;">{entry.offerRef || '—'}</td>
						<td><strong>{entry.jobType}</strong></td>
						<td style="color:#4a6072;">{entry.location}</td>
						<td style="color:#16a34a;font-weight:600;">{entry.rate}</td>
						<td><span class="lang-badge lb-en">{entry.langs}</span></td>
						<td style="color:#4a6072;font-size:12px;">{new Date(entry.createdAt ?? entry.availableFrom).toLocaleDateString('pl-PL')}</td>
						<td><button class="btn btn-eisg-danger btn-sm" onclick={() => deleteArchive(entry.id)}>Usuń</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
