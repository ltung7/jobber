import { setItem, getItemById, getItems, addItem, deleteItem } from "./firebase";

const collectionName: string = 'recruiterContracts';

export interface ContractTemplate {
    id?: string;
    title: string;
    description?: string;
    plText: string;
    enText: string;
    createdAt?: string;
    updatedAt?: string;
}

export const addContract = async (data: Omit<ContractTemplate, 'id'>) => {
    const timestamp = new Date().toISOString();
    return addItem({
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp
    }, collectionName);
};

export const setContract = async (id: string, data: Partial<ContractTemplate>) => {
    return setItem(id, {
        ...data,
        updatedAt: new Date().toISOString()
    }, collectionName, true);
};

export const getContract = async <T = ContractTemplate>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
};

export const findContracts = async <T = ContractTemplate>(
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionName, query, select);
};

export const deleteContract = async (id: string) => {
    return deleteItem(id, collectionName);
};
