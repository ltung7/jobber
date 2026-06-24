export const keyBy = <T=any>(arr: Array<any>, keyName : string | null = null, mapValue : string | null = null) : Record<string, T> => {
    if (keyName === null) {
        const firstItem = arr[0];
        if (firstItem.id) keyName = 'id';
        else keyName = Object.keys(arr[0])[0];
    }
    return arr.reduce((map, obj) => {
        map[obj[keyName]] = mapValue ? obj[mapValue] : obj;
        return map;
    }, {});
}
