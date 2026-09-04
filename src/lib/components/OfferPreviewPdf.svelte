<script lang="ts">
	import { T_LABELS } from '$lib/assets/messages';

	// Define props structure using Svelte 5 $props rune
	interface Props {
		offer: JobFormData;
		lang: Lang;
	}

	let { offer, lang }: Props = $props();

	// Translation helper logic
	function getLangText(node: keyof TranslatableJobInfo): string {
		if (!offer.lang || !offer.lang[lang] || !offer.lang[lang]?.[node]?.length) {
			return offer[node] || '';
		}
		return offer.lang[lang]?.[node] || '';
	}

	function getRateText(offer: JobFormData) {
		const rate = offer.rateFrom !== offer.rateTo ? `${offer.rateFrom} - ${offer.rateTo}` : `${offer.rateTo}`;
		const type = offer.rateNet ? labels.rate_net : labels.rate_gross;
		return labels.rate_label.replace('{rate}', rate).replace('{type}', type);
	}

	function splitDescription(text: string) {
		return text
			.split(/\r?\n/)
			.map((item) => {
				const trimmed = item.trim();
				return trimmed.startsWith('* ') ? trimmed.slice(2).trim() : trimmed;
			})
			.filter(Boolean);
	}

	const labels = $derived(T_LABELS[lang] as unknown as Record<string, string>);
</script>

<div class="offer-card" id="OfferPreviewPdf">
	<!-- Header -->
	<div class="offer-header">
		<div>
			<div class="offer-title">{labels.offerTitle || 'Job Offer'}</div>
			<div class="offer-subtitle">EISG</div>
		</div>
		<div class="offer-meta">
			{new Date().toLocaleDateString('en-GB')}
			{#if offer.offerRef}
				<br />
				<span class="offer-ref">{labels.ref || 'Ref'}: {offer.offerRef}</span>
			{/if}
		</div>
	</div>

	<!-- Main Job Details -->
	<div class="offer-job-type">{getLangText('jobType')}</div>
	<div class="offer-location">📍 {#if offer.location.length}{offer.location}, {/if}{offer.city}</div>

	<!-- Rate & Availability Badge -->
	<div class="offer-rate-badge">
		💰 {labels.rate || 'Rate'}: {getRateText(offer)}
		{#if offer.availableFrom}
			&nbsp;&nbsp;|&nbsp;&nbsp;📅 {labels.available || 'Available'}: {offer.availableFrom ? new Date(offer.availableFrom).toLocaleDateString('en-GB') : ''}
		{/if}
	</div>

	<!-- Grid Details -->
	<div class="offer-grid">
		{#if labels['contract_' + offer.contractType]}
			<div class="offer-row">
				<strong class="offer-row-label">{labels.contract || 'Contract'}:</strong><br />
				<span class="offer-row-val">{labels['contract_' + offer.contractType]}</span>
			</div>
		{/if}

		{#if labels['shift_' + offer.shift]}
			<div class="offer-row">
				<strong class="offer-row-label">{labels.shifts || 'Shifts'}:</strong><br />
				<span class="offer-row-val">{labels['shift_' + offer.shift]}</span>
			</div>
		{/if}

		{#if labels['accommodation_' + offer.accommodation]}
			<div class="offer-row">
				<strong class="offer-row-label">{labels.housing || 'Housing'}:</strong><br />
				<span class="offer-row-val">{labels['accommodation_' + offer.accommodation]}</span>
			</div>
		{/if}

		{#if offer.benefits && offer.benefits.length > 0}
			{@const benefitsList = offer.benefits.map((item) => labels['bnft_' + item] || item).join(', ')}
			{#if benefitsList}
				<div class="offer-row">
					<strong class="offer-row-label">{labels.benefits || 'Benefits'}:</strong><br />
					<span class="offer-row-val">{benefitsList}</span>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Dynamic Sections -->
	{#each ['workplaceDesc', 'requirements', 'duties', 'extra'] as key}
		{@const sectionVal = getLangText(key as keyof TranslatableJobInfo)}
		{#if sectionVal}
			{@const lines = splitDescription(sectionVal)}
			<div class="offer-sec">
				<div class="offer-sec-badge">{labels[key] || key}</div>
				<div class="offer-sec-val">
					{#each lines as line}
						<div>● {line}</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}

	<!-- Contact Block -->
	<div class="offer-sec">
		<div class="offer-sec-badge">{labels.contact || 'Contact'}</div>
		<div class="offer-sec-val">
			📱 +48 22 266 20 22<br />
			✉️ info@eisg.pl
		</div>
	</div>

	<!-- Footer -->
	<div class="offer-footer">{labels.footer || ''}</div>
</div>

<style>
	.offer-card {
		background: white;
		color: #002b49;
		border-radius: 10px;
		padding: 28px 32px;
		font-family: Montserrat, sans-serif;
		line-height: 1.7;
		width: 794px;
		min-width: 794px; /* Prevents Bootstrap/flexbox from shrinking the container */
		max-width: 794px;
		box-sizing: border-box;
	}

	.offer-header {
		border-bottom: 4px solid #c79100;
		padding-bottom: 14px;
		margin-bottom: 18px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.offer-title {
		font-size: 22px;
		font-weight: 800;
		color: #002b49;
		margin-bottom: 4px;
	}

	.offer-subtitle {
		font-size: 12px;
		font-weight: 700;
		color: #005258;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.offer-meta {
		font-size: 11px;
		color: #888;
		text-align: right;
	}

	.offer-ref {
		color: #005258;
		font-weight: 700;
	}

	.offer-job-type {
		font-size: 19px;
		font-weight: 800;
		color: #002b49;
		margin-bottom: 4px;
	}

	.offer-location {
		font-size: 13px;
		color: #005258;
		margin-bottom: 16px;
		font-weight: 600;
	}

	.offer-rate-badge {
		background: #e6f2f2;
		border-left: 4px solid #005258;
		padding: 10px 14px;
		border-radius: 0 6px 6px 0;
		font-weight: 700;
		color: #002b49;
		margin-bottom: 16px;
	}

	.offer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 16px;
	}

	.offer-row {
		margin-bottom: 8px;
	}

	.offer-row-label {
		font-size: 10px;
		color: #005258;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.offer-row-val {
		font-size: 13px;
		white-space: pre-line;
	}

	.offer-sec {
		margin-bottom: 14px;
	}

	.offer-sec-badge {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #fff;
		background: #005258;
		padding: 4px 10px;
		border-radius: 4px;
		display: inline-block;
		margin-bottom: 8px;
	}

	.offer-sec-val {
		font-size: 13px;
		color: #002b49;
		white-space: pre-line;
	}

	.offer-footer {
		margin-top: 20px;
		padding-top: 12px;
		border-top: 2px solid #c79100;
		font-size: 11px;
		color: #005258;
		text-align: center;
		font-weight: 600;
		letter-spacing: 0.04em;
	}
</style>
