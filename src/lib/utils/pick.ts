export const pick = (object: ExplicitAnyToExtend, keys: Array<string>) => {
    const newObject: Record<string,ExplicitAnyToExtend> = {};
    return keys.reduce((obj, key) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            obj[key] = object[key];
        }
        return obj;
    }, newObject)
};