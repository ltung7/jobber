import { setItem, getItemById, getItems, addItem, deleteItem } from "./firebase";

const collectionName: string = 'recruiterEnvelopes';

export interface EnvelopeParty {
    name: string;
    email?: string;
    phone?: string;
    deliveryMethod?: 'email' | 'SMS';
}

export interface SentEnvelope {
    id?: string;
    envelopeId: string;
    contractId?: string;
    contractTitle: string;
    contractorId?: string;
    contractorNip?: string;
    contracteeId?: string;
    sender: EnvelopeParty;
    receiver: EnvelopeParty;
    paymentMethod: 'bank' | 'cash';
    bankAccount?: string;
    recruiterId?: string | number;
    recruiterName?: string;
    status: string;
    plainText: string;
    createdAt: string;
    updatedAt?: string;
    signedAt?: string;
    completedAt?: string;
}

export const addEnvelope = async (data: Omit<SentEnvelope, 'id'>) => {
    const timestamp = new Date().toISOString();
    return addItem({
        ...data,
        createdAt: data.createdAt || timestamp,
        updatedAt: timestamp
    }, collectionName);
};

export const setEnvelope = async (id: string, data: Partial<SentEnvelope>) => {
    return setItem(id, {
        ...data,
        updatedAt: new Date().toISOString()
    }, collectionName, true);
};

export const getEnvelope = async <T = SentEnvelope>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
};

export const getEnvelopeByDocuSignId = async <T = SentEnvelope>(envelopeId: string): Promise<T | null> => {
    const items = await getItems<T>(collectionName, { envelopeId });
    return items.length > 0 ? items[0] : null;
};

export const findEnvelopes = async <T = SentEnvelope>(
    query: App.FirebaseItemsQuery = false,
    select: App.FirebaseItemsFields = false
): Promise<T[]> => {
    return getItems(collectionName, query, select);
};

export const findEnvelopesByRecruiterId = async <T = SentEnvelope>(
    recruiterId: string | number
): Promise<T[]> => {
    return getItems(collectionName, { recruiterId: String(recruiterId) });
};

export const findEnvelopesByContracteeId = async <T = SentEnvelope>(
    contracteeId: string
): Promise<T[]> => {
    return getItems(collectionName, { contracteeId: String(contracteeId) });
};

export const deleteEnvelope = async (id: string) => {
    return deleteItem(id, collectionName);
};
