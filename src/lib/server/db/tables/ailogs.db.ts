import sql from 'sql-bricks';
import { getItem, getItems, insertItems, getItemById, LOG_DATASET, getItemsBetween, aggregateItems } from './wrapper.db';

const TABLE_NAME = 'log_ailogs';
const INDEX = 'aiq';
const TIMESTAMP_MODIFIER = 1672527600000;

/**
 * Structure of an AI log entry.
 */
export interface AILog {
    aiq: string;          // Log time modifier (hex)
    question: string;     // Prompt
    answer: string;       // AI-generated answer
    account: string;      // Account that generated text
    usage: number;        // Number of tokens used
    length: number;       // Number of characters generated
    credited?: boolean;   // Whether generation was credited
    timestamp?: number;   // Creation time (epoch ms)
}

/* ------------------------------------------------------------------ */
/* Re-export helpers                                                  */
/* ------------------------------------------------------------------ */

export const getAiLog = getItemById(TABLE_NAME, INDEX)<AILog>;

export const getAiqText = async (account: string, aiq: string): Promise<Pick<AILog, 'answer'> | null> =>
    getItem(TABLE_NAME)(LOG_DATASET, { account, aiq }, [ 'answer' ]);

export const getAiLogsByTime = async (from: number, to: number, select?: (keyof AILog)[]): Promise<AILog[]> =>
    getItemsBetween(TABLE_NAME)(LOG_DATASET, from, to, select);

export const getAiLogs = async (offset: number, limit = 5): Promise<AILog[]> =>
    getItems(TABLE_NAME)(
        LOG_DATASET,
        null,
        null,
        'timestamp DESC',
        offset,
        limit,
    );

export const getAccountUsageLogs = (from: number, to: number) =>
    aggregateItems(TABLE_NAME)(
        LOG_DATASET,
        sql.between('timestamp', from, to),
        [ 'length' ],
        'account',
        'sum',
    );

/* ------------------------------------------------------------------ */
/* Business logic                                                     */
/* ------------------------------------------------------------------ */

export const addAiLog = async (question: string, answer: unknown, usage: number, length: number, account = 'admin'): Promise<string> => {
    const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer);
    const timestamp = Date.now();
    const aiq = 'LS' + (timestamp - TIMESTAMP_MODIFIER).toString(16);

    const data: Omit<AILog, 'credited'> = {
        aiq,
        answer: answerStr,
        question,
        usage,
        length,
        account,
        timestamp,
    };

    await insertItems(TABLE_NAME)(LOG_DATASET, [ data ]);
    return aiq;
};