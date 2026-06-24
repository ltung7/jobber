import { env } from "$env/dynamic/public"
import util from 'util';
import { AxiosError } from 'axios';
import fs from "fs";
import slackMessage from "$lib/server/services/slack.service";
import saveJson from "./saveJson";
import { error, json } from '@sveltejs/kit';
import { isDev } from "./isDev";

export const LOGGER_COLORS = {
    RED: '\x1b[31m%s\x1b[0m',
    GREEN: '\x1b[32m%s\x1b[0m',
    YELLOW: '\x1b[33m%s\x1b[0m',
    BLUE: '\x1b[34m%s\x1b[0m',
    MAGENTA: '\x1b[35m%s\x1b[0m',
    CYAN: '\x1b[36m%s\x1b[0m',
    WHITE: '\x1b[37m%s\x1b[0m',
    GRAY: '\x1b[30m%s\x1b[0m',
    UNDERLINE: '\x1b[52m%s\x1b[0m',
}

const logColor = (text: string, color = LOGGER_COLORS.BLUE) => {
    if (isDev) console.log(color, text);
}

const inspect = (data: ExplicitAnyToExtend) => console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));

const parseDatabaseError = (message: string) => {
    const notFound = message.match(/Not found: Table ecomsupportapp:(.+)\.(.+) was not found in location europe-central2/)
    if (notFound) return logger.error(notFound)

    const columnMissing = message.match(/Column (.+) is not present in table ecomsupportapp.(.+)\.(.+) at/)
    if (columnMissing) return logger.error(notFound)
}

export const dumpAxiosError = (err: Error) => {
    if (err instanceof AxiosError) {
        if (err.response) {
            console.log('\x1b[35m%s\x1b[0m', 'Axios error: ');
            console.log(err.response.data)
        } else {
            console.log('\x1b[35m%s\x1b[0m', 'Axios error: Invalid request to ' + err.request._currentUrl);
            throw err;
        }

        return false;
    }
    console.log('\x1b[35m%s\x1b[0m', 'Error: ' + (err.message ?? err));
}

export const throwAxiosError = (err: Error) => {
    dumpAxiosError(err);
    throw err;
}

const parseZodError = (error: ExplicitAnyToExtend) => {
    if (!error.flatten) {
        logColor('Error parsing list item: ' + (error.message ?? error), LOGGER_COLORS.RED)
        return error.message ?? error;
    }
    const obj = error.flatten();
    let message;
    if (obj.formErrors?.length) {
        message = obj.formErrors[0];
    }
    else {
        const firstKey = Object.keys(obj.fieldErrors)[0];
        message = `Error parsing list item: ${firstKey} - ${obj.fieldErrors[firstKey]}`;
    }
    logColor(message, LOGGER_COLORS.RED);
    return message;
}

export const logger = {
    log: logColor,
    gray: (text: string) => logColor(text, LOGGER_COLORS.GRAY),
    warn: (text: string) => logColor(text, LOGGER_COLORS.YELLOW),
    error: (err: string|unknown|Error, inspectItem: ExplicitAnyToExtend = null) => {
        if (!isDev) return;
        if (err instanceof Error) {
            const text = 'Error: ' + err.message;
            logColor(text, LOGGER_COLORS.RED)
            if (err.stack && err.stack.indexOf('\n') > 0) logColor(err.stack.split("\n")[1].trim(), LOGGER_COLORS.RED)
        } else logColor('Error: ' + ((err as Error).message ? (err as Error).message : err), LOGGER_COLORS.RED)
        if (inspectItem) inspect(inspectItem);
    },
    zod: parseZodError,
    inspect,
    silent: (_err: unknown) => null,
    verboseFunction: (functionName: string, data: unknown) => {
        if (!isDev) return;
        console.log('Calling function \x1b[36m%s\x1b[0m with parameters:', functionName);
        inspect(data);
    },
    dberror: (err: ExplicitAnyToExtend) => {
        if (!isDev) throw err;
        if (err?.response?.status?.errorResult) {
            console.log('\x1b[31mDatabase error:\x1b[0m', err.response.status.errorResult.message);
            parseDatabaseError(err.response.status.errorResult.message);
            throw new Error(err.response.status.errorResult.message)
        } else if (err.errors) {
            console.log('\x1b[31mDatabase error:\x1b[0m', err.errors[0].message);
            parseDatabaseError(err.errors[0].message);
            throw new Error(err.errors[0].message)
        } else {
            console.log('\x1b[31mDatabase error:\x1b[0m', err);
        }
        throw err;
    },
    dumpJson: (data: Map<string,ExplicitAnyToExtend>|Record<string,ExplicitAnyToExtend>|Array<ExplicitAnyToExtend>, label: string | number) => saveJson(data, label + '_' + Date.now().toString(36)),
    saveBuffer: saveJson
}

const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message?.length) return err.message;
    return 'Unknown error';
}

export const thrower = {
    getMessage: getErrorMessage,
    endpoint: (err: unknown, code: number = 500, log: boolean = false): never => {
        if (log) logger.error(err);
        const message = getErrorMessage(err)
        throw error(code, message);
    },
    endpointSoft: (err: unknown, log: boolean = false) => {
        if (log) logger.error(err);
        const message = getErrorMessage(err)
        return json({ success: false, message, v: env.PUBLIC_APP_VER })
    },
    slack: (err: unknown, prefix: string, throwError: number|boolean = false) => {
        logger.error(err);
        const message = prefix + ': ' + getErrorMessage(err);
        slackMessage(message);
        if (throwError) {
            if (throwError === true) throw new Error(message)
            else throw error(throwError, message)
        }
    },
    axios: (err: unknown, prefix: string) => {
        let errorMessage = prefix;
        if (err instanceof AxiosError) {
            if (err.response && err.response.data) {
                let dataMessage = err.response.data;
                if (typeof dataMessage === 'object') {
                    if (isDev) logger.saveBuffer(dataMessage, 'axioserr' + Date.now());
                } else if (typeof dataMessage !== 'string') {
                    dataMessage = Buffer.from(err.response.data).toString('utf-8')
                }
                if (typeof dataMessage === 'string') {
                    if (dataMessage.length > 1000) {
                        errorMessage = `${prefix} (${err.response.status})`;
                        if (isDev) fs.writeFileSync(`/tmp/${prefix}.html`, dataMessage);
                        logger.log(`Dumped HTML response file: ${prefix}.html`)
                    } else errorMessage = `${prefix} (${err.response.status}): ${dataMessage ?? "Unknown"}`;
                } else {
                    `${prefix} (${err.response.status}): ${JSON.stringify(dataMessage)}`;
                }
            } else if (err.message) {
                errorMessage += ': ' + err.message;
            }
        }
        throw new Error(errorMessage);
    }
}