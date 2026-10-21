import { setItem, getItemById, getItems, addItem, deleteItem } from "./firebase";

const collectionName: string = 'recruiterContractees';

export interface Contractee {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    deliveryMethod?: 'email' | 'SMS';
    paymentMethod?: 'bank' | 'cash';
    bankAccount?: string;
    recruiterId: string; // Bitrix UF_CRM_1790672831151 enumeration item ID
    recruiterName?: string;
    bitrixContactId?: string | number;
    createdAt?: string;
    updatedAt?: string;
}

export const addContractee = async (data: Omit<Contractee, 'id'>) => {
    const timestamp = new Date().toISOString();
    return addItem({
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp
    }, collectionName);
};

export const setContractee = async (id: string, data: Partial<Contractee>) => {
    return setItem(id, {
        ...data,
        updatedAt: new Date().toISOString()
    }, collectionName, true);
};

export const getContractee = async <T = Contractee>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
};

export const findContractees = async <T = Contractee>(
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionName, query, select);
};

export const findContracteesByRecruiterId = async <T = Contractee>(
    recruiterId: string
): Promise<T[]> => {
    return getItems(collectionName, { recruiterId: String(recruiterId) });
};

export const deleteContractee = async (id: string) => {
    return deleteItem(id, collectionName);
};
