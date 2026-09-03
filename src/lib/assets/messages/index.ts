import en from './en.json'
import pl from './pl.json'
import hi from './hi.json'
import ne from './ne.json'
import tl from './tl.json'
import uk from './uk.json'

export interface JobOfferTranslations {
    rate_label: string;
    rate_net: string;
    rate_gross: string;
    from_now: string;
    contract_uop: string;
    contract_uoz: string;
    contract_uod: string;
    shift_one: string;
    shift_two: string;
    shift_three: string;
    shift_agree: string;
    shift_flex: string;
    accommodation_: string;
    accommodation_free: string;
    accommodation_subsidized: string;
    accommodation_hostel: string;
    accommodation_apartment: string;
    accommodation_allowance: string;
    accommodation_couples: string;
    accommodation_hotel: string;
    benefits_training: string;
    benefits_accommodation: string;
    benefits_transport: string;
    benefits_meals: string;
    benefits_clothing: string;
    benefits_legalization: string;
    benefits_formalities: string;
    benefits_stability: string;
    benefits_salary: string;
    benefits_environment: string;
    offerTitle: string;
    position: string;
    location: string;
    available: string;
    housing: string;
    rate: string;
    contract: string;
    shifts: string;
    benefits: string;
    workplaceDesc: string;
    requirements: string;
    duties: string;
    extra: string;
    contact: string;
    ref: string;
    footer: string;
}

export const T_LABELS: Record<Lang, JobOfferTranslations> = { en, pl, hi, ne, tl, uk }