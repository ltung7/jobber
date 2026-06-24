<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';
	import { LANGUAGES, T_LABELS } from './const';

	interface Props {
		savedOffers: SavedOffer[];
		openEdit: (id: string) => void;
		previewSaved: (id: string) => void;
		deleteSaved: (id: string) => void;
		openCandidates: (id: string) => void;
	}
	let { savedOffers, openEdit, previewSaved, deleteSaved, openCandidates }: Props = $props();
</script>

<div class="mb-4">
	<h1 class="fs-5 fw-semibold mb-1">Oferty zapisane</h1>
	<p class="text-muted" style="font-size:13px;">Zapisane oferty z listą kandydatów.</p>
</div>
<div class="sheets-notice">
	<UIcon name="exclamation" />
	Kandydaci przechowywani lokalnie. Po podłączeniu Google Sheets — widoczni dla całego zespołu.
</div>
<div class="form-card" style="padding:0;overflow:hidden;">
	{#if savedOffers.length === 0}
		<div class="empty-state">
			<UIcon name="box" size={1} />
			<p>Brak zapisanych ofert.<br />Zapisz ofertę z formularza lub podglądu.</p>
		</div>
	{:else}
		<table class="data-table">
			<thead
				><tr>
					<th>Nr oferty</th><th>Stanowisko</th><th>Lokalizacja</th><th>Stawka</th><th>Język</th><th>Kandydaci</th><th>Sheets</th><th>Data zapisu</th><th></th>
				</tr></thead
			>
			<tbody>
				{#each savedOffers as offer (offer.id)}
					<tr>
						<td style="color:#4a6072;font-size:12px;">{offer.offerRef || '—'}</td>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<td><strong style="cursor:pointer;color:#005258;" onclick={() => openEdit(offer.id)}>{offer.jobType}</strong></td>
						<td style="color:#4a6072;">{offer.location}</td>
						<td style="color:#16a34a;font-weight:600;">{offer.rate}</td>
						<td>
							<span class="lang-badge lb-{offer.langExtra}" title={T_LABELS[offer.langExtra].name}>
								{@html LANGUAGES[offer.langExtra]}
							</span>
						</td>
						<td>
							<button class="btn btn-eisg-ghost btn-sm" onclick={() => openCandidates(offer.id)}>
								<UIcon name="users" />
								{offer.candidates.length}
							</button>
						</td>
						<td>
							{#if offer.sheetsUrl}
								<a href={offer.sheetsUrl} target="_blank" class="btn btn-eisg-ghost btn-sm" style="text-decoration:none;">
									<UIcon name="file-excel" />
									Arkusz
								</a>
							{:else}
								<span style="color:#8fa0ae;font-size:12px;">—</span>
							{/if}
						</td>
						<td style="color:#4a6072;font-size:12px;">{new Date(offer.savedAt).toLocaleDateString('pl-PL')}</td>
						<td>
							<div class="d-flex gap-2">
								<button class="btn btn-eisg-ghost btn-sm" onclick={() => openEdit(offer.id)} title="Edytuj">
									<UIcon name="edit" />
								</button>
								<button class="btn btn-eisg-ghost btn-sm" onclick={() => previewSaved(offer.id)}>PDF</button>
								<button class="btn btn-eisg-danger btn-sm" onclick={() => deleteSaved(offer.id)}>Usuń</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
