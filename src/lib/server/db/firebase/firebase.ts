import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_FIREBASE_REALTIME_URL, PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';
import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { logger } from "$lib/utils/logger";
import { isDev } from '$lib/utils/isDev';

const firebaseConfig = { projectId: PUBLIC_FIREBASE_PROJECT_ID, databaseURL: PUBLIC_FIREBASE_REALTIME_URL }
let app: App | null, initializedFirestore: admin.firestore.Firestore | null;

export const initialize = () => {
    if (app) return app;
    const apps = getApps();
    if (apps.length) return app = apps[0];
    return initializeApp(firebaseConfig);
};

export const db = () => {
    if (!initializedFirestore) {
        if (!app) app = initialize();
        initializedFirestore = getFirestore(app);
    }

    return initializedFirestore;
};

export const getRef = (collectionName: string) => {
    const ref: admin.firestore.CollectionReference = db().collection(collectionName);
    return ref;
}

export const getQuery = (collectionName: string) => {
    const ref: admin.firestore.Query = db().collection(collectionName);
    return ref;
}

const getBaseWhereQuery = (ref: admin.firestore.Query, queryParams: Exclude<App.FirebaseItemsQuery, false>) => {
    let queryArr: App.FirebaseQueryElement;
    if (!Array.isArray(queryParams)) {
        for (const [ field, value ] of Object.entries(queryParams)) {
            ref = ref.where(field, '==', value);
        }
    } else {
        queryArr = queryParams as App.FirebaseQueryElement;
        ref = ref.where(...queryArr);
    }
    return ref;
}

export const addItem = async (item: ExplicitAnyToExtend, collectionName: string) => {
    const docRef = await getRef(collectionName).add(item)
    return docRef.path.split('/').pop();
}

export const setItem = async (id: string, data: ExplicitAnyToExtend, collectionName: string, merge = false) => {
    delete data.id;
    try {
        const docRef = await getRef(collectionName).doc("" + id).set(data, { merge });
        return docRef;
    } catch (err: unknown) {
        logger.error("FIREBASE ERROR | SET ITEM | ", { id, data, collectionName, merge })
        throw err;
    }
}

export const deleteItem = async (id: string, collectionName: string) => getRef(collectionName).doc("" + id).delete();

export const updateItem = async (id: string, data: ExplicitAnyToExtend, collectionName: string) => {
    if (data.id) delete data.id;
    try {
        const docRef = await getRef(collectionName).doc("" + id).update(data);
        return docRef;
    } catch (err: unknown) {
        logger.error("FIREBASE ERROR | UPDATE ITEM | ", { id, data, collectionName })
        throw err;
    }
}

export const icreaseItemValue = async (id: string, field: string, value: number, collectionName: string) => {
    const ref = getRef(collectionName).doc("" + id);
    return ref.update({ [field]: admin.firestore.FieldValue.increment(value) });
}


export const batchAdd = async (collectionName: string, list: Array<any>) => {
    do {
        const part = list.splice(0, 500);
        await batchAddLimit(collectionName, part);
    } while (list.length > 0);
}

export const batchAddLimit = async (collectionName: string, list: Array<any>) => {
    const batchRef = db().batch()
    const collection = db().collection(collectionName);
    for(const item of list) {
        batchRef.set(collection.doc(), item)
    } 
    return await batchRef.commit();
}

export const batchOperationsBig = async (collectionName: string, list: Array<any>, operation: 'update' | 'delete' | 'set' = 'update') => {
    let part;
    try {
        do {
            part = list.splice(0, 500);
            await batchOperations(collectionName, part, operation);
        } while (list.length > 0);
    } catch (err: unknown) {
        logger.error("FIREBASE ERROR | BIG BATCH | ", { collectionName, part, length: list.length, operation })
        throw err;
    }
}

export const batchOperations = async (collectionName: string, listOrObject: Record<string, any> | Array<any>, operation: 'update' | 'delete' | 'set' = 'update') => {
    const batchRef = db().batch();
    const collection = db().collection(collectionName);
    if (!Array.isArray(listOrObject) && listOrObject?.id) listOrObject = [ listOrObject ];
    if (Array.isArray(listOrObject)) {
        for(const item of listOrObject) {
            const id = item.id;
            if (!id) {
                logger.error('ITEM MISSING ID', { item });
                continue;
            }
            delete item.id;
            if (operation === 'set') batchRef.set(collection.doc(id.toString()), item)
            else batchRef[operation](collection.doc(id.toString()), item)
        } 
    } else if (typeof listOrObject === 'object') {
        for(const [ id, item ] of Object.entries(listOrObject)) {
            if (operation === 'set') batchRef.set(collection.doc(id), item)
            else batchRef[operation](collection.doc(id), item)
        }
    } else throw new Error('Unknown list of operations')
    return await batchRef.commit();
}

const getSingleDoc = async (query: Promise<admin.firestore.DocumentData>) => {
    const result = await query;
    if (result.size < 1) return null;
    return { id: result.docs[0].id, ...result.docs[0].data() };
}

export const getDocs = async (query: Promise<admin.firestore.DocumentData>): Promise<Array<any>> => {
    const result = await query;
    if (result.size < 1) return [];
    return result.docs.map((doc: { id: string; data: () => ExplicitAnyToExtend; }) => ({ id: doc.id, ...doc.data() }));
}

const getDocsMap = async <T=any> (query: Promise<admin.firestore.DocumentData>, mappedValue: string | true = true): Promise<Map<string, T>> => {
    const result = await query;
    const resultMap = new Map();
    if (mappedValue === true) {
        for (const doc of result.docs) {
            resultMap.set(doc.id, doc.data());
        }
    } else {
        for (const doc of result.docs) {
            resultMap.set(doc.id, doc.data()[mappedValue]);
        }
    }
    return resultMap;
}

export const queryItems = async <T=any> (collectionName: string, queries: App.FirebaseQueryList, select: App.FirebaseItemsFields = false, order: App.FirebaseOrderQuery = false, limit: number | false = false): Promise<T[]> => {
    let ref = getItemsMultiQuery(collectionName, queries, select);
    if (order) ref = ref.orderBy(...order)
    if (limit) ref = ref.limit(limit)
    return getDocs(ref.get());
}

const getItemsMultiQuery = (collectionName: string, queries: App.FirebaseQueryList, select: App.FirebaseItemsFields = false) => {
    let ref = getQuery(collectionName);
    if (Array.isArray(queries)) {
        queries;
        for (const query of queries as App.FirebaseQueryElement[]) {
            query;
            if (!Array.isArray(query)) throw new Error("Invalid query: expected array of arrays");
            ref = ref.where(...query);
        }
    } else {
        for (const [ field, value ] of Object.entries(queries)) {
            ref = ref.where(field, '==', value);
        }
    }
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return ref;
}

export const queryItemIds = async (collectionName: string, queryParams: App.FirebaseQueryList): Promise<string[]> => {
    const ref = getItemsMultiQuery(collectionName, queryParams, [ 'id' ]);
    const results = await ref.get();
    if (results.size === 0) return [];
    return results.docs.map((doc: { id: string; }) => doc.id);
}

const getItemsQuery = (collectionName: string, queryParams: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false) => {
    let ref = getQuery(collectionName);
    if (queryParams) ref = getBaseWhereQuery(ref, queryParams);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return ref;
}

export const getItems = async <T=any> (collectionName: string, queryParams: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false, order: App.FirebaseOrderQuery = false): Promise<Array<T>> => {
    if (queryParams && Array.isArray(queryParams) && queryParams[1] === 'in') return getItemsIn(collectionName, queryParams, select);
    let ref = getItemsQuery(collectionName, queryParams, select);
    if (order) ref = ref.orderBy(...order)
    return getDocs(ref.get());
}

export const getMappedItems = async <T=any> (collectionName: string, queryParams: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false, mappedValue: string | true = true, order: App.FirebaseOrderQuery = false): Promise<Map<string, T>> => {
    let ref = getItemsQuery(collectionName, queryParams, select);
    if (order) ref = ref.orderBy(...order)
    return getDocsMap<T>(ref.get(), mappedValue);
}

export const getFirstItem = async <T=any> (collectionName: string, queryParams: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T|null> => {
    const ref = getItemsQuery(collectionName, queryParams, select);
    return getSingleDoc(ref.get());
}

export const getItemsIn = async <T=any> (collectionName: string, queryParams: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    const results = [];
    if (!queryParams) return getItems(collectionName, queryParams, select);
    if (queryParams[1] !== 'in') return getItems(collectionName, queryParams, select);
    const indexTable = [ ...queryParams[2] ], field = queryParams[0];
    if (indexTable.length === 0) throw new Error('Invalid params array')
    do {
        const partialTable = indexTable.splice(0, 30);
        let ref = getRef(collectionName).where(field, 'in', partialTable);
        if (select) {
            if (Array.isArray(select)) ref = ref.select(...select);
            else ref = ref.select(select);
        }
        const partialResults = await getDocs(ref.get());
        if (partialResults.length) results.push(...partialResults);
    } while (indexTable.length > 0)
    return results;
}

export const countItems = async (collectionName: string, query: App.FirebaseItemsQuery) => {
    const ref = getItemsQuery(collectionName, query);
    const response = await ref.count().get();
    return response.data().count;
}

export const countQueryItems = async (collectionName: string, queries: App.FirebaseQueryList) => {
    const ref = getItemsMultiQuery(collectionName, queries);
    const response = await ref.count().get();
    return response.data().count;
}

export const getLatestItems = async <T=any> (collectionName: string, limit = 10, select: App.FirebaseItemsFields = false, offset = 0, queryParams: App.FirebaseItemsQuery = false, field = 'timestamp'): Promise<T[]> => {
    let ref = getRef(collectionName).orderBy(field, 'desc').limit(limit);
    if (offset) ref = ref.startAfter(offset);
    if (queryParams) ref = getBaseWhereQuery(ref, queryParams)
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocs(ref.get());
}

export const getOldestItems = async <T=any> (collectionName: string, limit = 10, select: App.FirebaseItemsFields = false, offset = 0, queryParams: App.FirebaseItemsQuery = false, field = 'timestamp'): Promise<T[]> => {
    let ref = getRef(collectionName).orderBy(field, 'asc').limit(limit);
    if (queryParams) ref = getBaseWhereQuery(ref, queryParams)
    if (offset) ref = ref.startAfter(offset);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocs(ref.get());
}

export const getLatest = async <T=any> (collectionName: string, select: App.FirebaseItemsFields = false, queryParams: App.FirebaseItemsQuery = false, field = 'timestamp'): Promise<T|null> => {
    let ref = getRef(collectionName).orderBy(field, 'desc').limit(1);
    if (queryParams) ref = getBaseWhereQuery(ref, queryParams);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getSingleDoc(ref.get());
}

export const getItemsByIds = async <T=any> (collectionName: string, ids: Array<string>, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    if (ids.length === 0) return [];
    let ref = getRef(collectionName).where(admin.firestore.FieldPath.documentId(), "in", ids);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocs(ref.get());
}

export const getItemsByIdsBig = async <T=any> (collectionName: string, ids: Array<string>, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    const results = [];
    while (ids.length > 0) {
        const partialTable = ids.splice(0, 30);
        let ref = getRef(collectionName).where(admin.firestore.FieldPath.documentId(), "in", partialTable);
        if (select) {
            if (Array.isArray(select)) ref = ref.select(...select);
            else ref = ref.select(select);
        }
        const partialResults = await getDocs(ref.get());
        if (partialResults.length) results.push(...partialResults);
    }
    return results;
}

export const getMapByIds = async <T=any> (collectionName: string, ids: Array<string>, select: App.FirebaseItemsFields = false) => {
    if (ids.length === 0) return false;
    let ref = getRef(collectionName).where(admin.firestore.FieldPath.documentId(), "in", ids);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocsMap<T>(ref.get());
}

export const getItemById = async <T = any>(id: string, collectionName: string): Promise<T|null> => {
    try {
        const docRef = await getRef(collectionName).doc(id.toString()).get();
        const data = docRef.data() as T & { id: string };
        if (data) data.id = id;
        return data;
    } catch (err: unknown) {
        logger.error(err);
        throw err;
    }
}

export const selectItem = async <T=any> (collectionName: string, id: string, select: App.FirebaseItemsFields = false, queryParams: App.FirebaseItemsQuery = false): Promise<T|null> => {
    const ref = (getItemsQuery(collectionName, queryParams, select)).where(admin.firestore.FieldPath.documentId(), "==", id);
    return getSingleDoc(ref.get());
}

export const itemExists = async (id: string, collectionName: string) => {
    const docRef = await getRef(collectionName).doc(id).get();
    return docRef.exists;
}

export const storeContent = async (content: string | Buffer | Uint8Array, filename: string) => {
    initialize();
    const file = admin.storage().bucket(PUBLIC_FIREBASE_STORAGE_BUCKET).file(filename);
    return file.save(content, {
        gzip: true,
        contentType: 'text/plain'
    }).then(() => {
        logger.log(filename + ' has been stored');
    });
}

export const getStoredContent = async (filename: string, json = true) => {
    initialize();
    const file = admin.storage().bucket(PUBLIC_FIREBASE_STORAGE_BUCKET).file(filename);
    return file.download().then(data => json ? JSON.parse(data[0].toString()): data[0].toString());
}

export const getItemsBetween = async <T=any> (collectionName: string, from: string | number, to: string | number, select: App.FirebaseItemsFields = false, field = 'id'): Promise<T[]> => {
    let ref = getRef(collectionName).orderBy(field, 'desc').where(field, '>=', from).where(field, '<=', to);
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocs(ref.get());
}

export const queryItemsBetween = async <T=any> (collectionName: string, queryParams: App.FirebaseItemsQuery = false, from: string | number, to: string | number, select: App.FirebaseItemsFields = false, field = 'id'): Promise<T[]> => {
    let ref = getRef(collectionName).where(field, '>=', from).where(field, '<=', to);;
    if (queryParams) ref = getBaseWhereQuery(ref, queryParams)
    if (select) {
        if (Array.isArray(select)) ref = ref.select(...select);
        else ref = ref.select(select);
    }
    return getDocs(ref.get());
} 

export const deleteFirebaseCollection = async (collectionName: string) => {
    const ref = getRef(collectionName);
    return db().recursiveDelete(ref);
}

export const batchSetMergeBig = async (collectionName: string, list: Array<any>): Promise<void> => {
    try {
        do {
            const part = list.splice(0, 500);
            await batchSetMerge(collectionName, part);
        } while (list.length > 0);
    } catch (err) {
        if (isDev) logger.error("DB ERROR | BIG BATCH SET MERGE", { collectionName, list })
        throw err;
    }
}

export const batchSetMerge = async (collectionName: string, listOrObject: Record<string, any> | Array<any>): Promise<void> => {
    const batchRef = db().batch();
    const collection = db().collection(collectionName);

    if (Array.isArray(listOrObject)) {
        for (const item of listOrObject) {
            const id = item.id;
            if (!id) {
                logger.error('ITEM MISSING ID', { item });
                continue;
            }
            delete item.id;
            batchRef.set(collection.doc(id), item, { merge: true });
        }
    } else if (typeof listOrObject === 'object') {
        for (const [ id, item ] of Object.entries(listOrObject)) {
            batchRef.set(collection.doc(id), item, { merge: true });
        }
    } else throw new Error('Unknown list of operations');

    await batchRef.commit();
}