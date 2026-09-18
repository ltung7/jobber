export const CONTRACT_OPTIONS = ['Umowa o pracę / Contract of employment', 'Umowa zlecenie / Civil law contract', 'Umowa o dzieło / Contract for specific work'];
export const SHIFT_OPTIONS = ['Jedna zmiana / Day shift', 'Dwie zmiany / Two shifts', 'Trzy zmiany / Three shifts (24/7)', 'Do ustalenia / To be agreed'];

export const CONTRACT_OPTION_LIST: Record<ContractType, string> = {
    uop: 'Umowa o pracę / Contract of employment',
    uoz: 'Umowa zlecenie / Civil law contract',
    uod: 'Umowa o dzieło / Contract for specific work'
}

export const SHIFT_OPTION_LIST: Record<ShiftType, string> = {
    one: 'Jedna zmiana / Day shift',
    two: 'Dwie zmiany / Two shifts',
    three: 'Trzy zmiany / Three shifts (24/7)',
    agree: 'Do ustalenia / To be agreed',
    flex: 'Elastyczna / Flexible shifts'
}

export const CONTRACT_OPTION_LIST_EN: Record<ContractType, string> = {
    uop: 'Contract of employment',
    uoz: 'Civil law contract',
    uod: 'Contract for specific work'
}

export const SHIFT_OPTION_LIST_EN: Record<ShiftType, string> = {
    one: 'Day shift',
    two: 'Two shifts',
    three: 'Three shifts (24/7)',
    agree: 'To be agreed',
    flex: 'Flexible shifts'
}

export const ACCOMMODATION_OPTION_LIST: Record<AccommodationType, string> = {
    '': 'Accommodation not provided',
    free: 'Free accommodation fully covered by the employer.',
    subsidized: 'Subsidized housing with partial costs deducted from salary.',
    hostel: 'Standard worker hostel room shared with colleagues.',
    apartment: 'Company-rented apartment shared in a smaller group.',
    allowance: 'Monthly housing allowance for renting independently.',
    couples: 'Dedicated room for couples or qualified specialists.',
    hotel: 'Temporary hotel accommodation for the initial trial period.'
};

export const BENEFITS_LIST: Record<BenefitType, string> = {
    training: 'Full on-the-job training provided with no prior experience required',
    accommodation: 'Free accommodation near the place of work provided',
    transport: 'Free transport to and from the workplace',
    meals: 'Free meals provided during shifts',
    clothing: 'Free work clothing and protective gear provided',
    legalization: 'Free legalization support for work permits and residence',
    formalities: 'Full assistance with all employment formalities',
    stability: 'Stable long-term employment opportunities',
    salary: 'Competitive salary with guaranteed timely payments',
    environment: 'Friendly working environment with dedicated coordinator support'
};

export const TRANSLATE_LANGS: Array<Lang> = [ 'pl', 'hi', 'ne', 'uk', 'tl', 'fr', 'hr' ];

export const INITIAL_FORM: JobFormData = {
	jobType: '',
	location: '',
	city: '',
	availableFrom: new Date().toISOString().slice(0, 10),
	accommodation: '',
	rateFrom: 0,
	rateTo: 0,
	rateNet: true,
	contractType: 'uoz',
	shift: 'one',
	benefits: [],
	workplaceDesc: '',
	requirements: '',
	duties: '',
	extra: '',
	offerRef: '',
	lang: {},
    public: false
};

export const LANGUAGES = {
    en: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/en.svg" alt="English" title="English" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> English',
    pl: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/pl.svg" alt="Polski" title="Polski" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Polski',
    hi: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/in.svg" alt="Hindi" title="Hindi" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Hindi',
    ne: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/ne.svg" alt="Nepali" title="Nepali" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Nepali',
    uk: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/ua.svg" alt="Ukrainian" title="Ukrainian" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Ukrainian',
    tl: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/ph.svg" alt="Filipino" title="Filipino" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Filipino',
    fr: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/fr.svg" alt="Française" title="Française" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Française',
    hr: '<img src="https://storage.googleapis.com/feed-cdn-files/flags/hr.svg" alt="Hrvatski" title="Hrvatski" style="height: 21px; width: 28px;" class="flag border rounded" width="28" height="21"> Hrvatski',
}