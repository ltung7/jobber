export default function searchParamsToObject(url : URL) {
    const obj : Record<string, ExplicitAnyToExtend> = {};
    // eslint-disable-next-line prefer-const
    for (let [ key, value ] of url.searchParams) {
        const bracket = key.indexOf('[');
        let objectValue: string|Record<string, ExplicitAnyToExtend> = value;
        if (bracket > 0) {
            const subkey = key.substring(bracket + 1, key.length - 1);
            key = key.substring(0, bracket);
            const tempObj: Record<string, ExplicitAnyToExtend> = {};
            tempObj[subkey] = value;
            objectValue = tempObj;
        }

        if (obj[key]) {
            if (Array.isArray(obj[key])) {
                obj[key].push(objectValue);
            } else if (typeof objectValue === 'object') {
                Object.assign(obj[key], objectValue)
            } else {
                obj[key] = [ obj[key], objectValue ];
            }
        } else {
            obj[key] = objectValue;
        }
    }
    return obj;
}