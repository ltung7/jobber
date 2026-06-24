import { setItem, getItemById } from "./firebase";

const collectionName = 'jobber';

export const setSettings = async (data: Settings) => {
    return setItem('settings', data, collectionName);
}

export const getSettings = async <T=Settings> (): Promise<T|null> => {
    return getItemById('settings', collectionName);
}