import { findJobberOffersList, setJobberOffersList } from '$lib/server/db/firebase/jobber.fdb';
import { TRANSLATE_LANGS } from '$lib/components/const';
import { makeMultipleTranslations } from '$lib/server/services/translate.service';
import { logger } from '$lib/utils/logger';

export const fillMissingTranslations = async () => {
	const offers = await findJobberOffersList({ public: true });
	logger.log(`Found ${offers.length} public offers to process`);

	for (const offer of offers) {
		const offerLangs = Object.keys(offer.lang || {});
		const missingLangs = TRANSLATE_LANGS.filter((lang) => !offerLangs.includes(lang));

		if (missingLangs.length === 0) {
			logger.gray(`${offer.jobType} [${offer.id}]: all translations up to date`);
			continue;
		}

		logger.warn(`${offer.jobType} [${offer.id}]: missing ${missingLangs.length} translations (${missingLangs.join(', ')})`);

		try {
			const translations = await makeMultipleTranslations(offer as any, missingLangs);
			const updatedLang = { ...offer.lang };

			for (const lang of missingLangs) {
				if (translations[lang]) {
					updatedLang[lang] = translations[lang] as any;
				}
			}

			if (offer.id) {
				await setJobberOffersList(offer.id, { lang: updatedLang });
				logger.success(`${offer.jobType} [${offer.id}]: updated with ${missingLangs.length} new translations`);
			}
		} catch (err) {
			logger.error(err);
		}
	}
	
	logger.success('Translation fill process completed');
};
