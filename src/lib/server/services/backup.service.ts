import { findJobberOffersList, findArchivedOffersList, findDeletedOffersList } from "../db/firebase/jobber.fdb";
import { getSettings } from "../db/firebase/settings.fdb";
import saveJson from "$lib/utils/saveJson";
import loadJson from "$lib/utils/loadJson";
import { batchOperationsBig, setItem } from "../db/firebase/firebase";

export const backupFirebaseData = async (filename: string = 'backup') => {
    const offers = await findJobberOffersList();
    const archived = await findArchivedOffersList();
    const deleted = await findDeletedOffersList();
    const settings = await getSettings();

    const data = {
        offers,
        archived,
        deleted,
        settings
    };

    return saveJson(data, filename);
}

export const restoreFirebaseData = async (filename: string) => {
    const data = await loadJson(filename);

    if (data.offers && Array.isArray(data.offers)) {
        await batchOperationsBig('jobOffers', data.offers, 'set');
    }

    if (data.archived && Array.isArray(data.archived)) {
        await batchOperationsBig('jobArchived', data.archived, 'set');
    }

    if (data.deleted && Array.isArray(data.deleted)) {
        await batchOperationsBig('jobDeleted', data.deleted, 'set');
    }

    if (data.settings) {
        await setItem('settings', data.settings, 'settings');
    }
}
