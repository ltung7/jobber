import { setItem, getItemById, getItems, addItem, db, getRef } from "./firebase";

const collectionName: string = 'jobber/offers/list';

export const addJobberOffersList = async (data: SavedOffer) => {
    return addItem(data, collectionName);
}

export const setJobberOffersList = async (id: string, data: SavedOffer) => {
    return setItem(id, data, collectionName, true);
}

export const getJobberOffersList = async <T = SavedOffer>(id: string): Promise<T | null> => {
    return getItemById(id, collectionName);
}

export const findJobberOffersList = async <T = SavedOffer>(query: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    return getItems(collectionName, query, select);
}

const archivedCollectionName: string = 'jobber/offers/archived';

export const addArchivedOffersList = async (data: SavedOffer) => {
    return addItem(data, archivedCollectionName);
}

export const findArchivedOffersList = async <T = SavedOffer>(query: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    return getItems(archivedCollectionName, query, select);
}

export const archiveJobberOfferList = async (offer: SavedOffer) => {
    // Move an offer from the active collection to the archived collection atomically.
    // Adds an `createdAt` timestamp to record when the offer was archived.
    const firestore = db();
    const srcRef = getRef(collectionName).doc(offer.id);
    const destRef = getRef(archivedCollectionName).doc(offer.id);
    await firestore.runTransaction(async (transaction) => {
        const srcDoc = await transaction.get(srcRef);
        if (!srcDoc.exists) {
            // Nothing to archive; exit silently.
            return;
        }
        const data = srcDoc.data() as SavedOffer;
        const archivedData = { ...data, createdAt: new Date().toISOString(), langs: data.langExtra.toUpperCase() };
        transaction.set(destRef, archivedData);
        transaction.delete(srcRef);
    });
    return true;
}


const deletedCollectionName: string = 'jobber/offers/deleted';

export const findDeletedOffersList = async <T = SavedOffer>(query: App.FirebaseItemsQuery = false, select: App.FirebaseItemsFields = false): Promise<T[]> => {
    return getItems(deletedCollectionName, query, select);
}

export const deleteJobberOfferList = async (offer: SavedOffer) => {
    // Move an offer from the active collection to the deleted collection atomically.
    // Uses a Firestore transaction to ensure the document is copied with a deletion timestamp
    // and then removed from the original collection.
    const firestore = db();
    const srcRef = getRef(collectionName).doc(offer.id);
    const destRef = getRef(deletedCollectionName).doc(offer.id);
    await firestore.runTransaction(async (transaction) => {
        const srcDoc = await transaction.get(srcRef);
        if (!srcDoc.exists) {
            // Nothing to delete; exit silently.
            return;
        }
        const data = srcDoc.data();
        // Preserve all fields and add a deletion timestamp.
        const deletedData = { ...data, deletedAt: new Date().toISOString() };
        transaction.set(destRef, deletedData);
        transaction.delete(srcRef);
    });
    return true;
}