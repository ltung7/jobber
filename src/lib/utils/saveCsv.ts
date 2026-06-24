import { writeFile } from 'fs/promises';
import { genericDataToAoa, getGenericHeaders } from './objToArray';

/**
 * Save data as a CSV file.
 * @param data - Either a CSV string, an array of rows (string[]), or an array of objects.
 * @param filename - Base name or full path for the output file. Defaults to a timestamp.
 * @param separator - Column delimiter, defaulting to ';'.
 * @returns Promise resolved when the file is written.
 */
export default async (
    data: any[] | string[][] | Record<string, unknown>[],
    filename: string | number = Date.now().toString(),
    separator: string = ';'
): Promise<void> => {
    let contents: string | undefined;

    if (Array.isArray(data)) {
        // Array of rows (string[][])
        if (Array.isArray(data[0])) {
            contents = (data as string[][])
                .map(row => row.join(separator))
                .join('\r\n');
        }
        // Array of objects
        else if (typeof data[0] === 'object') {
            const headers = getGenericHeaders(data as Record<string, unknown>[]);
            const rows: string[] = [];
            rows.push(headers.join(separator));
            for (const obj of data as Record<string, unknown>[]) {
                const row = genericDataToAoa(obj, headers);
                rows.push(row.join(separator));
            }
            contents = rows.join('\r\n');
        }
    } else if (typeof data === 'string') {
        contents = data;
    }

    if (!contents) {
        console.error('Invalid CSV content');
        return;
    }

    // Ensure a file path; if only a name is given, place it in /tmp
    if (filename.toString().indexOf('/') === -1) {
        filename = `/tmp/${filename}.csv`;
    }
    await writeFile(filename as string, contents);
};
