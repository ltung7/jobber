import { setItem, getItemById, getItems } from "./firebase";

const mainCollectionName: string = 'streamer';
const subCollectionName: string = '__name__';

const collectionRef = (accountId: string): string => [ mainCollectionName, accountId, subCollectionName ].join('/');

export const set__objName__ = async (accountId: string, id: string, data: ExplicitAnyToExtend) => {
    return setItem(id, data, collectionRef(accountId), true);
}

export const get__objName__ = async <T=ExplicitAnyToExtend> (accountId: string, id: string): Promise<T|null> => {
    return getItemById(id, collectionRef(accountId));
}

export const find__objName__ = async <T=ExplicitAnyToExtend> (accountId: string, query: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    return getItems(collectionRef(accountId), query, select);
}