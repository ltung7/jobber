import { BLOCKED_FIELD_KEYS } from './config';

/**
 * Recursively sanitizes payloads to strip GDPR/RODO sensitive data (file URLs, attachments, photos, portal passwords).
 */
export const sanitizeBitrixPayload = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeBitrixPayload(item));
    }

    if (typeof data === 'object') {
        // Check if object itself is a file container (e.g. { downloadUrl, showUrl } or { urlMachine })
        if (
            (data.downloadUrl && data.showUrl) ||
            data.urlMachine ||
            (data.fileData && Array.isArray(data.fileData))
        ) {
            return '[REDACTED_FILE_RODO]';
        }

        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            // Check if key is blacklisted
            if (BLOCKED_FIELD_KEYS.has(key)) {
                sanitized[key] = '[REDACTED_RODO]';
                continue;
            }

            // Check if key case-insensitively matches file or password patterns
            const lowerKey = key.toLowerCase();
            if (
                lowerKey.includes('password') ||
                lowerKey.includes('haslo') ||
                lowerKey.includes('credential') ||
                lowerKey.includes('secret')
            ) {
                sanitized[key] = '[REDACTED_PASSWORD]';
                continue;
            }

            sanitized[key] = sanitizeBitrixPayload(value);
        }
        return sanitized;
    }

    return data;
};

/**
 * Sanitizes select field arrays to remove blacklisted fields.
 */
export const sanitizeSelectFields = (select?: string[]): string[] | undefined => {
    if (!select) return select;
    return select.filter(field => {
        if (BLOCKED_FIELD_KEYS.has(field)) return false;
        const upper = field.toUpperCase();
        if (upper === 'PHOTO' || upper === 'FILES' || upper === 'WEBDAV_ELEMENTS' || upper === 'STORAGE_ELEMENT_IDS') {
            return false;
        }
        return true;
    });
};
