import { createHash } from 'crypto';

const hash = (text, algo, result) => {
    if (!text) throw new Error('Invalid text');
    return createHash(algo).update(text).digest(result);
}

const md5 = (message) => hash(message, 'md5', 'hex')
const sha1 = (message) => hash(message, 'sha1', 'hex')

export default (str, alfanumeric, length = 32) => {
    if (!str) throw new Error('Invalid string');
    length = Math.min(length, 32);
    const md5str = md5(str);
    const shastr = sha1(str);
    let min = 35, max = 126;
    if (alfanumeric) {
        min = 48;
        max = 122;
    }
    const result = [];
    for (let i = 0; i < length; i++) {
        let ord = md5str.charCodeAt(i) + shastr.charCodeAt(i) + i - 40;
        if (ord > max) ord -= max - min;
        if (alfanumeric) {
            if (ord > 57 && ord < 65) ord -= 9;
            if (ord > 90 && ord < 97) ord += 9;
        }
        result.push(String.fromCharCode(ord));
    }
    return result.join('');
}