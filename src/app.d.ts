declare global {
	type ExplicitAnyToExtend = any;
	type ExplicitAnyToTest = any;

	namespace App {
		interface Locals {
			admin: boolean;
			subRoute?: string | undefined,
			auth: BaseUserData;
		}

		/**
		 * Generic Firestore query element.
		 * K is a string key (defaults to `string`). The value is kept as `any` to retain current flexibility.
		 */
		type FirebaseQueryElement<K extends string = string> = [K, '==', any];

		/**
		 * Generic Firestore items query.
		 * Allows a map of field/value pairs where keys are of type K, a single query element, or `false`.
		 * Defaults to `string` for full backward compatibility.
		 */
		type FirebaseItemsQuery<K extends string = string> = Partial<Record<K, any>> | FirebaseQueryElement<K> | false;

		/**
		 * Generic Firestore query list.
		 * Allows either a map of field/value pairs (keys of type K) or an array of generic query elements.
		 */
		type FirebaseQueryList<K extends string = string> = Record<K, any> | Array<FirebaseQueryElement<K>>;

		/**
		 * Generic Firestore items fields list.
		 * An array of field keys of type K (defaults to string) or false.
		 */
		type FirebaseItemsFields<K extends string = string> = Array<K> | false;

		/**
		 * Generic Firestore order query.
		 * Specifies a field key of type K (defaults to string) and direction.
		 */
		type FirebaseOrderQuery<K extends string = string> = [K, 'asc' | 'desc'] | false;
	}

	// type Lang = 'en' | 'pl' | 'hi' | 'ne' | 'hr' | 'uk' | 'be' | 'tl' | 'es' | 'uz' | 'bn' | 'ka' | 'ro';
	type Lang = 'en' | 'pl' | 'hi' | 'ne' | 'uk' | 'tl' | 'bn';
	type View = 'generator' | 'saved' | 'archive' | 'settings' | 'feedback';
	type PreviewTab = 'offer' | 'msg';
	type ToastType = 'success' | 'info';

	type ContractType = 'uop' | 'uoz' | 'uod';
	type ShiftType = 'one' | 'two' | 'three' | 'agree' | 'flex';
	type AccommodationType = '' | 'free' | 'subsidized' | 'hostel' | 'apartment' | 'allowance' | 'couples' | 'hotel';
	type BenefitType = 'training' | 'accommodation' | 'transport' | 'meals' | 'clothing' | 'legalization' | 'formalities' | 'stability'| 'salary'| 'environment';

	// Props for components that accept an active view
	interface FeedbackRequestProps {
		view?: View;
	}

	interface FeedbackData extends FeedbackRequestProps {
		message: string;
		browser: string;
		platform: string;
		width: number;
		email: string;
		version: string;
		timestamp?: number;
	}

	interface JobFormData {
		jobType: string;
		location: string;
		city: string;
		availableFrom: string;
		accommodation: AccommodationType;
		// rate: string;
		rateFrom: number;
		rateTo: number;
		rateNet: boolean;
		contractType: ContractType;
		shift: ShiftType;
		benefits: BenefitType[], 
		benefits: string;
		workplaceDesc: string;
		requirements: string;
		duties: string;
		extra: string;
		offerRef: string;
		langExtra: Lang;
	}

	interface Candidate {
		firstName: string;
		lastName: string;
		passport: string;
		contact: string;
		notes: string;
		addedAt: string;
	}

	interface SavedOffer extends JobFormData {
		id: string;
		savedAt: string;
		updatedAt?: string;
		candidates: Candidate[];
	}

	interface DeletedOffer extends SavedOffer {
		deletedAt: string;
	}

	interface ArchiveEntry extends JobFormData {
		id: string;
		createdAt: string;
		langs: string;
	}

	interface Settings {
		sheetsId: string;
		sheetsKey: string;
	}

	interface CandidateForm {
		firstName: string;
		lastName: string;
		passport: string;
		contact: string;
		notes: string;
	}
}

export { };