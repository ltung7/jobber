/**
 * Processes FormData object to multidimensional object
 * @param {FormData} form
 * @returns {Record<string, any>}
 */
export const parseForm = (form : FormData) => {
    const obj : Record<string, any> = {};
    form.forEach((value, keyString) => {
        const keys = keyString.split('.');
        const key = keys[0];
        if (keys.length === 1) return obj[key] = value; 
        
        let ref = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!ref[key]) ref[key] = {};
            ref = ref[key];
        }
        ref[keys[keys.length-1]] = value;
    });
    return obj;
}