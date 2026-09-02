<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';

	interface Props {
		archivedOffers: ArchiveEntry[];
		deleteArchive: (id: string) => void;
	}
	let { archivedOffers, deleteArchive }: Props = $props();
</script>

<div class="mb-4">
	<h1 class="fs-5 fw-semibold mb-1">PDF Archive</h1>
	<p class="text-muted" style="font-size:13px;">History of generated PDF files.</p>
</div>
<div class="form-card" style="padding:0;overflow:hidden;">
	{#if archivedOffers.length === 0}
		<div class="empty-state">
			<UIcon name="box" size={1} />
			<p>No generated PDFs.<br />Generate your first offer.</p>
		</div>
	{:else}
		<table class="data-table">
			<thead
				><tr>
					<th>Offer Ref.</th><th>Position</th><th>Location</th><th>Rate</th><th>Languages</th><th>Date Generated</th><th></th>
				</tr></thead
			>
			<tbody>
				{#each archivedOffers as entry (entry.id)}
					<tr>
						<td style="color:#4a6072;font-size:12px;">{entry.offerRef || '—'}</td>
						<td><strong>{entry.jobType}</strong></td>
						<td style="color:#4a6072;">{entry.location}</td>
						<td style="color:#16a34a;font-weight:600;">{entry.rateTo}</td>
						<td><span class="lang-badge lb-en">{entry.langs}</span></td>
						<td style="color:#4a6072;font-size:12px;">{new Date(entry.createdAt ?? entry.availableFrom).toLocaleDateString('en-GB')}</td>
						<td><button class="btn btn-eisg-danger btn-sm" onclick={() => deleteArchive(entry.id)}>Delete</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
