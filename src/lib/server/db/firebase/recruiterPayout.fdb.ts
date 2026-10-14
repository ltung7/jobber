import { setItem, getItemById, getItems, addItem } from "./firebase";

const collectionName: string = 'recruiterPayouts';

export interface RecruiterPayoutContractor {
    id: string | number;
    name: string;
    days: number;
}

export interface RecruiterPayout {
    id?: string;
    recruiterId: string;
    recruiterName?: string;
    payoutValue: number;
    month: string;
    year: string;
    includedContractors: RecruiterPayoutContractor[];
    createdAt?: string;
    note?: string;
}

export const addRecruiterPayout = async (data: RecruiterPayout) => {
    return addItem(data, collectionName);
};

export const setRecruiterPayout = async (id: string, data: Partial<RecruiterPayout>) => {
    return setItem(id, data, collectionName, true);
};

export const getRecruiterPayout = async <T = RecruiterPayout>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
};

export const findRecruiterPayouts = async <T = RecruiterPayout>(
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionName, query, select);
};
