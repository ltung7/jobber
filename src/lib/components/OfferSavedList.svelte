<script lang="ts">
	import UIcon from '$lib/misc/UIcon.svelte';
	import { LANGUAGES, T_LABELS } from './const';
	import RatePreview from './RatePreview.svelte';

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
    <h1 class="fs-5 fw-semibold mb-1">Saved Offers</h1>
    <p class="text-muted" style="font-size:13px;">Saved offers with a candidate list.</p>
</div>
<div class="sheets-notice">
    <UIcon name="exclamation" />
    Candidates are stored locally. Once connected to Google Sheets, they will be visible to the entire team.
</div>
<div class="form-card" style="padding:0;overflow:hidden;">
    {#if savedOffers.length === 0}
        <div class="empty-state">
            <UIcon name="box" size={1} />
            <p>No saved offers.<br />Save an offer from the form or preview.</p>
        </div>
    {:else}
        <table class="data-table">
            <thead
                ><tr>
                    <th>Offer Ref.</th><th>Position</th><th>Location</th><th>Rate</th><th>Language</th><th>Candidates</th><th>Date Saved</th><th></th>
                </tr></thead
            >
            <tbody>
                {#each savedOffers as offer (offer.id)}
                    <tr>
                        <td style="color:#4a6072;font-size:12px;">{offer.offerRef || '—'}</td>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <td><strong style="cursor:pointer;color:#005258;" onclick={() => openEdit(offer.id)}>{offer.jobType}</strong></td>
                        <td style="color:#4a6072;">{offer.location}, {offer.city}</td>
                        <td style="min-width: 125px;">
                            <RatePreview rateFrom={offer.rateFrom} rateTo={offer.rateTo} rateNet={offer.rateNet} />
                        </td>
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
                        <td style="color:#4a6072;font-size:12px;">{new Date(offer.savedAt).toLocaleDateString('en-GB')}</td>
                        <td>
                            <div class="d-flex gap-2">
                                <button class="btn btn-eisg-ghost btn-sm" onclick={() => openEdit(offer.id)} title="Edit">
                                    <UIcon name="edit" />
                                </button>
                                <button class="btn btn-eisg-ghost btn-sm" onclick={() => previewSaved(offer.id)}>PDF</button>
                                <button class="btn btn-eisg-danger btn-sm" onclick={() => deleteSaved(offer.id)}>Delete</button>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>