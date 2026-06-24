export const mapBy = (arr : Array<any>, keyName : string | null = null, mapValue : string | null = null) => {
    if (keyName === null) {
        if (arr[0]?.id) keyName = 'id';
        else keyName = Object.keys(arr[0])[0];
    }
    return arr.reduce((map, obj) => {
        map.set(obj[keyName], mapValue ? obj[mapValue] : obj);
        return map;
    }, new Map());
}