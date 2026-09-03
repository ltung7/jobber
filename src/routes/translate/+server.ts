import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	checkSecurity,
	makeTranslation,
	makeMultipleTranslations
} from '$lib/server/services/translate.service';

const DEMO_RESPONSE = {
	"pl": {
		"workplaceDesc": "Apex Logistics prowadzi centrum dystrybucyjne o dużej objętości, skoncentrowane na regionalnej realizacji zamówień detalicznych. Obiekt jest czysty, klimatyzowany i zorientowany na bezpieczeństwo. Miejsce pracy kładzie nacisk na stałą komunikację zespołową, niezawodną frekwencję i aktywną pracę fizyczną w wspierającym środowisku załogi.",
		"requirements": "Rozładunek przychodzących towarów, kontrola paczek pod kątem uszkodzeń i sortowanie zapasów do przypisanych pojemników.\nKompletowanie, pakowanie i etykietowanie zamówień klientów z zachowaniem dokładności, przy użyciu ręcznych skanerów kodów kreskowych.\nObsługa ręcznych wózków paletowych, wózków ręcznych i urządzeń do owijania w celu bezpiecznego przemieszczania towarów po magazynie.\nUtrzymywanie czystego, wolnego od zagrożeń miejsca pracy poprzez zamiatanie alejek, usuwanie śmieci i układanie pustych palet.\nPomoc w rutynowych inwentaryzacjach i zgłaszanie rozbieżności w stanach magazynowych przełożonym zmianowym.",
		"duties": "Zdolność do podnoszenia, przenoszenia i manewrowania przedmiotami o wadze do 22,7 kg (50 funtów) wielokrotnie podczas 8-godzinnej zmiany.\nKomfort w staniu, chodzeniu, schylaniu się i sięganiu przez dłuższe okresy.\nWykształcenie średnie lub równoważne (GED).\nNiezawodny transport i punktualność.\nPodstawowe umiejętności czytania, pisania i liczenia do weryfikacji manifestów wysyłkowych.",
		"extra": "Proces selekcji: Rozmowa kwalifikacyjna na miejscu (walk-through) → podstawowa ocena zdolności podnoszenia/bezpieczeństwa → weryfikacja przeszłości.",
		"jobType": "Pracownik Magazynu (TEST)"
	},
	"hi": {
		"workplaceDesc": "एपेक्स लॉजिस्टिक्स एक उच्च मात्रा वाले वितरण केंद्र का संचालन करता है जो क्षेत्रीय खुदरा पूर्ति पर केंद्रित है। सुविधा स्वच्छ, वातानुकूलित और सुरक्षा-केंद्रित है। कार्यस्थल एक सहायक दल के माहौल में स्थिर टीम संचार, विश्वसनीय उपस्थिति और सक्रिय शारीरिक श्रम पर जोर देता है।",
		"requirements": "आवक माल को उतारना, क्षति के लिए पैकेजों का निरीक्षण करना और इन्वेंट्री को निर्दिष्ट भंडारण डिब्बे में छाँटना।\nहैंड-हेल्ड बारकोड स्कैनर का उपयोग करके ग्राहक के आदेशों को सटीक रूप से चुनना, पैक करना और लेबल करना।\nमाल को फर्श पर सुरक्षित रूप से ले जाने के लिए मैनुअल पैलेट जैक, हैंड ट्रक और रैपिंग उपकरण संचालित करना।\nगलियारों की सफाई करके, कचरा निपटाकर और खाली पैलेटों को स्टैक करके एक साफ, खतरों से मुक्त कार्यक्षेत्र बनाए रखना।\nनियमित स्टॉक गणना में सहायता करना और इन्वेंट्री विसंगतियों की सूचना शिफ्ट पर्यवेक्षकों को देना।",
		"duties": "8 घंटे की शिफ्ट के दौरान बार-बार 50 पाउंड तक की वस्तुओं को उठाने, ले जाने और हिलाने की क्षमता।\nलंबे समय तक खड़े रहने, चलने, झुकने और पहुँचने में सहजता।\nहाई स्कूल डिप्लोमा या जीईडी समकक्ष।\nविश्वसनीय परिवहन और समय पर उपस्थिति।\nशिपिंग मैनिफेस्ट को सत्यापित करने के लिए बुनियादी पढ़ने, लिखने और गणितीय कौशल।",
		"extra": "चयन प्रक्रिया: ऑन-साइट वॉक-थ्रू साक्षात्कार → बुनियादी उठाने/सुरक्षा मूल्यांकन → पृष्ठभूमि की जाँच।",
		"jobType": "वेयरहाउस एसोसिएट (परीक्षण)"
	},
	"ne": {
		"workplaceDesc": "एपेक्स लोजिस्टिक्सले क्षेत्रीय खुद्रा पूर्तिको लागि केन्द्रित उच्च-भोल्युम वितरण केन्द्र सञ्चालन गर्दछ। सुविधा सफा, वातानुकूलित, र सुरक्षा-केन्द्रित छ। कार्यस्थलले स्थिर टोली सञ्चार, भरपर्दो उपस्थिति, र सहयोगी कर्मचारी वातावरणमा सक्रिय श्रममा जोड दिन्छ।",
		"requirements": "आउने मालसामान अनलोड गर्ने, प्याकेजहरूमा क्षति भएको छ कि छैन जाँच गर्ने, र सूचीलाई तोकिएको भण्डारण डिब्बाहरूमा क्रमबद्ध गर्ने।\nहातले समात्ने बारकोड स्क्यानर प्रयोग गरेर ग्राहकका अर्डरहरू सही रूपमा छान्ने, प्याक गर्ने, र लेबल लगाउने।\nसामानलाई भुइँमा सुरक्षित रूपमा सार्नका लागि म्यानुअल प्यालेट ज्याक, ह्यान्ड ट्रक, र र्यापिङ उपकरण सञ्चालन गर्ने।\nगलियारा सफा गरेर, फोहोर व्यवस्थापन गरेर, र खाली प्यालेटहरू थुपारेर सफा र जोखिमरहित कार्यस्थान कायम गर्ने।\nनियमित स्टक गणनामा सहयोग गर्ने र इन्भेन्टरीमा देखिएका असामान्यताहरू सिफ्ट सुपरभाइजरहरूलाई रिपोर्ट गर्ने।",
		"duties": "८-घण्टाको सिफ्टमा बारम्बार ५० पाउन्ड (लगभग २२.७ किलोग्राम) सम्मका सामानहरू उठाउन, बोक्न र चलाउन सक्ने क्षमता।\nलामो समयसम्म उभिन, हिँड्न, झुक्न र सामानसम्म पुग्न सहज हुनु।\nउच्च विद्यालय डिप्लोमा वा GED बराबरको शिक्षा।\nभरपर्दो यातायात र समयमा उपस्थिति।\nशिपिंग मेनिफेस्टहरू प्रमाणित गर्नका लागि आधारभूत पढ्ने, लेख्ने र गणितीय सीपहरू।",
		"extra": "छनोट प्रक्रिया: अन-साइट वाक-थ्रु अन्तर्वार्ता → आधारभूत लिफ्टिङ/सुरक्षा मूल्याङ्कन → पृष्ठभूमि जाँच।",
		"jobType": "गोदाम सहयोगी (परीक्षण)"
	},
	"uk": {
		"workplaceDesc": "Apex Logistics керує центром дистрибуції великого обсягу, орієнтованим на виконання регіональних роздрібних замовлень. Об'єкт чистий, з контрольованим кліматом та зосереджений на безпеці. Робоче місце наголошує на стабільній командній комунікації, надійній відвідуваності та активній фізичній праці в сприятливому колективному середовищі.",
		"requirements": "Розвантажувати вхідні вантажі, перевіряти упаковки на наявність пошкоджень та сортувати запаси до призначених місць зберігання.\nВідбирати, пакувати та маркувати замовлення клієнтів точно, використовуючи ручні сканери штрих-кодів.\nКерувати ручними візками для палет, ручними візками та пакувальним обладнанням для безпечного переміщення товарів по підлозі.\nПідтримувати чисте, безпечне робоче місце, підмітаючи проходи, прибираючи сміття та складаючи порожні палети.\nДопомагати з плановими підрахунками запасів та повідомляти про розбіжності в інвентаризації керівникам зміни.",
		"duties": "Здатність піднімати, переносити та маневрувати предметами вагою до 22,7 кг (50 фунтів) багаторазово протягом 8-годинної зміни.\nКомфортне перебування стоячи, ходіння, нахиляння та тягнення рук протягом тривалого часу.\nДиплом середньої школи або еквівалент GED.\nНадійний транспорт та пунктуальність.\nБазові навички читання, письма та математики для перевірки відвантажувальних маніфестів.",
		"extra": "Процес відбору: Співбесіда на місці з оглядом → базова оцінка здатності підйому/безпеки → перевірка біографічних даних.",
		"jobType": "Працівник складу (ТЕСТ)"
	},
	"tl": {
		"workplaceDesc": "Ang Apex Logistics ay nagpapatakbo ng isang high-volume distribution center na nakatuon sa pagtupad ng mga regional retail order. Ang pasilidad ay malinis, may kontroladong klima, at nakatuon sa kaligtasan. Binibigyang-diin ng lugar ng trabaho ang matatag na komunikasyon ng team, maaasahang pagpasok, at aktibong manu-manong paggawa sa isang sumusuportang kapaligiran ng crew.",
		"requirements": "Magbaba ng mga papasok na kargamento, suriin ang mga pakete para sa pinsala, at ayusin ang imbentaryo sa mga itinalagang storage bin.\nPumili, magbalot, at lagyan ng label ang mga order ng customer nang tumpak gamit ang hand-held barcode scanner.\nMagpatakbo ng manual pallet jacks, hand trucks, at wrapping equipment upang ligtas na mailipat ang mga kalakal sa buong sahig.\nPanatilihin ang isang malinis at walang panganib na workspace sa pamamagitan ng pagwawalis ng mga pasilyo, pagtatapon ng basura, at pagtatambak ng mga walang laman na paleta.\nTumulong sa mga routine stock count at iulat ang mga pagkakaiba sa imbentaryo sa mga shift supervisor.",
		"duties": "Kakayahang magbuhat, magdala, at magmaniobra ng mga item na hanggang 50 lbs (humigit-kumulang 22.7 kg) nang paulit-ulit sa loob ng 8-oras na shift.\nKumportable sa pagtayo, paglalakad, pagyuko, at pag-abot sa mahabang panahon.\nHigh school diploma o katumbas ng GED.\nMaaasahang transportasyon at maagap na pagpasok.\nMga pangunahing kasanayan sa pagbasa, pagsulat, at matematika upang mapatunayan ang mga shipping manifest.",
		"extra": "Proseso ng Pagpili: On-site walk-through interview → basic lifting/safety assessment → background check.",
		"jobType": "Warehouse Associate (TEST)"
	}
}

export const POST: RequestHandler = async ({ request, url }) => {
	checkSecurity(request, url);
	return json({ translated: DEMO_RESPONSE })
	throw error(500, 'EVIL');
	
	let body: {
		fields: TranslatableJobInfo;
		targetLang?: Lang | string;
		targetLangs?: Lang[];
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body.');
	}

	const { fields, targetLang, targetLangs } = body;

	if (typeof targetLang === 'string' && targetLang) {
		const translated = await makeTranslation(fields, targetLang);
		return json({ translated });
	}

	if (
		Array.isArray(targetLangs) &&
		targetLangs.length > 0 &&
		targetLangs.every((lang) => typeof lang === 'string')
	) {
		const translated = await makeMultipleTranslations(fields, targetLangs);
		return json({ translated });
	}

	throw error(400, 'Missing or invalid "targetLang" (string) or "targetLangs" (string[]).');
};