import { T_LABELS } from '$lib/assets/messages';

export function buildMessengerText(offer: JobFormData, lang: Lang): string {
    const labels = T_LABELS[lang] as unknown as Record<string,string>;

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
			.filter(Boolean)
            .map(item => '• ' + item)
            .join('\n')
	}

    const lines = [
        `💼 *${labels.offerTitle} — EISG*`,
        offer.offerRef && `📋 Ref: ${offer.offerRef}`,
        `\n🔧 *${labels.position}:* ${getLangText('jobType')}`,
        `📍 *${labels.location}:* ${offer.location.length ? (offer.location + ', ') : ''}${offer.city}`,
        `💰 *${labels.rate}:* ${getRateText(offer)}`,
        offer.contractType && `📄 *${labels.contact}:* ${labels['contract_' + offer.contractType]}`,
        offer.shift && `🕐 *${labels.shifts}:* ${labels['shift_' + offer.shift]}`,
        offer.availableFrom && `📅 *${labels.available}:* ${new Date(offer.availableFrom).toLocaleDateString('en-GB')}`,
        offer.accommodation && `🏠 *${labels.housing}:* ${labels['accommodation_' + offer.accommodation]}`,
        offer.benefits?.length && `🎁 *${labels.benefits}:* ${offer.benefits.map((b) => labels['bnft_' + b]).join(', ')}`,
        offer.workplaceDesc && `\n🏭 *${labels.workplaceDesc}:*\n${splitDescription(getLangText('workplaceDesc'))}`,
        offer.requirements && `\n✅ *${labels.requirements}:*\n${splitDescription(getLangText('requirements'))}`,
        offer.duties && `\n📌 *${labels.duties}:*\n${splitDescription(getLangText('duties'))}`,
        offer.extra && `\nℹ️ *${labels.extra}:*\n${splitDescription(getLangText('extra'))}`,
        `\n📞 *${labels.contact}:*`,
        `📱 +48 222 66 20 22`,
        `✉️ info@eisg.pl`,
        `\n—\n${labels.footer}`
    ];

    return lines.filter(Boolean).join('\n');
}