import { writeFile } from 'fs/promises';
import { logger } from './logger';

export default async (data: Map<string,ExplicitAnyToExtend>|Record<string,ExplicitAnyToExtend>|Array<ExplicitAnyToExtend>, filename: string | null = null, indent = 4) => {
    if (typeof data !== 'object') {
        logger.error('Failed to save json - invalid data type: ' + typeof data);
        return '';
    }
    if (data instanceof Map) data = Array.from(data.entries());
    if (!filename && !Array.isArray(data)) {
        if (Object.keys(data).length === 1) {
            const key = Object.keys(data).pop();
            if (key) {
                data = data[key];
                filename = key;
            }
        }
    }

    if (!filename) filename = Date.now().toString();
    if (filename.toString().indexOf('/') === -1) filename = `/tmp/${filename}.json`;
    await writeFile(filename, JSON.stringify(data, null, indent))
    return filename;
}