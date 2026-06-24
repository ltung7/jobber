import crypto from 'crypto'
import { env } from '$env/dynamic/private';

export const decryptAlgo = (ciphertext : string, algorithm = 'aes-256-cbc') => decryptSecret(ciphertext, env.EC_SECRET, algorithm);

export const decryptSecret = (ciphertext : string, secret : string, algorithm = 'aes-256-cbc') => {
    const ciphertextBytes = Buffer.from(ciphertext, 'base64');
    const iv = ciphertextBytes.slice(0, 16);
    const data = ciphertextBytes.slice(16);
    const decipher = crypto.createDecipheriv(algorithm, secret, Uint8Array.from(iv));
    const plaintextBytes = Buffer.concat([ 
        Uint8Array.from(decipher.update(Uint8Array.from(data))), 
        Uint8Array.from(decipher.final())
    ]);
    return plaintextBytes.toString('utf8');
}

export const encryptSecret = (message : string, secret : string, algorithm = 'aes-256-cbc') => {
    const iv = Uint8Array.from(crypto.randomBytes(16));
    const cipher = crypto.createCipheriv(algorithm, secret, iv);
    const ciphertext = Buffer.concat([
        iv, 
        Uint8Array.from(cipher.update(message)), 
        Uint8Array.from(cipher.final())
    ]);
    return ciphertext.toString('base64');
}

export const encryptAlgo = (message : string, algorithm = 'aes-256-cbc') => encryptSecret(message, env.EC_SECRET, algorithm);

export const encryptGcm = (message : string) => {
    const secret = env.EC_SECRET;
    const iv = Uint8Array.from(crypto.randomBytes(16));
    const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
    const separator = '$'
    const ciphertext = Buffer.concat([
        iv, 
        Uint8Array.from(cipher.update(message)), 
        Uint8Array.from(cipher.final())
    ]);
    return ciphertext.toString('base64') + separator + cipher.getAuthTag().toString('base64');
}

export const decryptGcm = (ciphertext : string) => {
    const secret = env.EC_SECRET;
    const separator = ciphertext.indexOf('$');
    if (separator < 0) throw new Error('Invalid GCM string');
    const tag = Buffer.from(ciphertext.slice(separator + 1), 'base64');
    ciphertext = ciphertext.slice(0, separator);
    const ciphertextBytes = Buffer.from(ciphertext, 'base64');
    const iv = Uint8Array.from(ciphertextBytes.slice(0, 16));
    const data = ciphertextBytes.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAuthTag(Uint8Array.from(tag));
    const plaintextBytes = Buffer.concat([ 
        Uint8Array.from(decipher.update(Uint8Array.from(data))), 
        Uint8Array.from(decipher.final()) 
    ]);
    return plaintextBytes.toString('utf8');
}

export const encrypt = encryptGcm;

export const decrypt = (message : string) => {
    const separator = '$'
    if (message.indexOf(separator, message.length - 25) > -1) return decryptGcm(message);
    return decryptAlgo(message);
}

export const encryptGcmDeterministic = (message: string) => {
    const secret = env.EC_SECRET;
    // Derive a fixed IV from the key using HKDF — never a hardcoded constant
    const iv = Buffer.from(crypto.hkdfSync('sha256', secret, '', 'deterministic-iv', 12));
    const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
    const ciphertext = Buffer.concat([
        Uint8Array.from(cipher.update(message, 'utf8')),
        Uint8Array.from(cipher.final()),
    ]);
    return ciphertext.toString('base64') + '$' + cipher.getAuthTag().toString('base64');
};

export const decryptGcmDeterministic = (encrypted: string) => {
    const secret = env.EC_SECRET;
    const separatorIdx = encrypted.indexOf('$');
    if (separatorIdx < 0) throw new Error('Invalid GCM string');
    const iv = Buffer.from(crypto.hkdfSync('sha256', secret, '', 'deterministic-iv', 12));
    const tag = Buffer.from(encrypted.slice(separatorIdx + 1), 'base64');
    const ciphertextBytes = Buffer.from(encrypted.slice(0, separatorIdx), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
        Uint8Array.from(decipher.update(Uint8Array.from(ciphertextBytes))),
        Uint8Array.from(decipher.final()),
    ]);
    return plaintext.toString('utf8');
};