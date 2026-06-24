import { env } from '$env/dynamic/private';
import { logger, dumpAxiosError } from '$lib/utils/logger';
import { decryptAlgo } from '../secure/encrypt';
import axios from 'axios';

const getHook = () => 'https://hooks.slack.com/services/' + decryptAlgo(env.SLACK_SECRET);

export const slackError = async (promise : Promise<any>) => {
    try {
        return await promise;
    } catch (err : unknown) {
        logger.error(err);
        slackErrorMessage(err);
    }
}

export const slackErrorMessage = (error: ExplicitAnyToExtend) => {
    if (error?.message) slackMessage('Jobber error: ' + error.message);
    if (typeof error === 'string') slackMessage('Jobber' + error);
    slackMessage('Jobber error: ' + JSON.stringify(error));
}

export const slackMessage = async (message : string) => {
    if (!message || message.length === 0) return false;
    try {
        const hook = getHook();
        return axios.post(hook, { text: '[EI] ' + message.toString() }).then(response => response.data).catch(dumpAxiosError);
    } catch (err: unknown) { console.error('SLACK ERROR: ' + err) };
}

export default slackMessage;