export const getGenericHeaders = (data: Record<string,ExplicitAnyToExtend>[]): string[] => {
    const keys: Set<string> = new Set();
    for (const obj of data) {
        for (const key of Object.keys(obj)) keys.add(key);
    }
    return [ ...keys ];
}

export const genericDataToAoa = (obj: Record<string,ExplicitAnyToExtend>, headers: string[]) => {
    if (!headers) headers = getGenericHeaders([ obj ]);
    const row = [];
    for (const key of headers) {
        row.push(obj[key] ?? '');
    }
    return row;
}