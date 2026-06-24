import { readFile } from 'fs/promises'

export default async (filename : string) => {
    if (filename.indexOf('/') === -1) filename = `/tmp/${filename}.json`;
    return JSON.parse(await readFile(filename, 'utf-8'))
}