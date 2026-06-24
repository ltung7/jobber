export const kitPromise = (action : (_any?: ExplicitAnyToExtend) => Promise<any>) => {
    return new Promise((resolve, reject) => {
        action().then((response : ExplicitAnyToExtend) => {
            if (response?.message && response.message !== 'ok') reject(response.message);
            else resolve(response);
        });
    })
}