import { setItem, getItemById, getItems, addItem, deleteItem } from "./firebase";

const collectionName: string = 'recruiterContractors';

export interface Contractor {
    id?: string;
    name: string;
    nip: string;
    regon?: string;
    krs?: string;
    address: string;
    representative?: string;
    email: string;
    phone?: string;
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export const addContractor = async (data: Omit<Contractor, 'id'>) => {
    const timestamp = new Date().toISOString();
    return addItem({
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp
    }, collectionName);
};

export const setContractor = async (id: string, data: Partial<Contractor>) => {
    return setItem(id, {
        ...data,
        updatedAt: new Date().toISOString()
    }, collectionName, true);
};

export const getContractor = async <T = Contractor>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
};

export const findContractors = async <T = Contractor>(
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionName, query, select);
};

export const deleteContractor = async (id: string) => {
    return deleteItem(id, collectionName);
};

/**
 * Ensures default EISG Sp. z o.o. contractor exists in Firebase under recruiterContractors.
 */
export const ensureDefaultContractor = async (): Promise<Contractor> => {
    const existing = await findContractors();
    const defaultOne = existing.find(c => c.isDefault || c.nip === '5252637218');
    if (defaultOne) {
        return defaultOne;
    }

    const defaultData: Omit<Contractor, 'id'> = {
        name: 'EISG Sp. z o.o.',
        nip: '5252637218',
        regon: '363065097',
        krs: '0000588661',
        address: 'ul. Złota 59, 00-120 Warszawa',
        email: 'biuro@eisg.pl',
        phone: '+48 22 123 45 67',
        isDefault: true
    };

    const newId = await addContractor(defaultData);
    return {
        id: typeof newId === 'string' ? newId : undefined,
        ...defaultData
    };
};
