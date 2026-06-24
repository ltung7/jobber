import { isDev } from "./isDev";
import loadJson from "./loadJson";
import { logger } from "./logger";

const getBufferedData = async <T>(
    filename: string,
    resolve: () => Promise<T>,
    skipRealInstance = false
): Promise<T> => {
    if ((skipRealInstance && !isDev) || !filename.length) return await resolve();
    try { return await loadJson(filename) as T; }
    catch (err) { err; }
    const result = await resolve();
    if (typeof result !== 'undefined') await logger.saveBuffer(result as ExplicitAnyToExtend, filename);
    return result;
}

export default getBufferedData;