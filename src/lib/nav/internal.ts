import { browser } from '$app/environment';
import axios, { AxiosError, type AxiosResponse } from 'axios'
import { addToast } from "$lib/toast";
import { writable, get as getStore } from 'svelte/store';

export const apiRequest = writable({});

type ApiRequestLog = {
    method: string,
    url: string,
    status?: string,
    message?: string,
    length?: number,
    data?: string
}

const catchApiReqError = (apiReq: ApiRequestLog | null = null) => (err: AxiosError) => {
    if (!apiReq) return;
    if (!err.response) {
        addToast('Uknown Axios error');
        return;
    }
    addToast((err.response.data as Error).message)
    setApiError(err, apiReq)
    return err.response;
}

const setApiRequest = (method: string, url: string, data: Record<string,any>) => {
    if (!url.length) return null;
    const apiReq: ApiRequestLog = { method, url }
    if (data) apiReq.data = JSON.stringify(data);
    apiRequest.set(apiReq);
    return apiReq
}

const setApiResponse = (response: AxiosResponse, apiReq: ApiRequestLog | null = null) => {
    if (!response.status || !apiReq) return;
    apiReq.status = response.status.toString();
    if (response.headers) {
        apiReq.length = 0;
        if (response.headers['content-length'] && typeof response.headers['content-length'] === 'string') {
            apiReq.length = parseInt(response.headers['content-length']);
        }
    }
    apiRequest.set(apiReq);
}

const setApiError = (err: AxiosError, apiReq: ApiRequestLog) => {
    if (!err.response) return;
    apiReq.status = err.response.status.toString();
    apiReq.message = (err.response.data as Error).message;
    if (err.response.headers) {
        apiReq.length = 0;
        if (err.response.headers['content-length'] && typeof err.response.headers['content-length'] === 'string') {
            apiReq.length = parseInt(err.response.headers['content-length']);
        }
    }
    apiRequest.set(apiReq);
}

const apiRoute = '/api/'
const headers = {
    Accept: 'application/json'
}

const get = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}, apiRoute: boolean = false) => {
    if (url.startsWith('//')) url = url.substring(1);
    if (!browser) return;
    config.params = data;
    const apiReq = setApiRequest('GET', url, data)
    const response = await axios.get(url, config).catch(catchApiReqError(apiReq));
    if (!response) return;
    setApiResponse(response, apiReq);
    return response.data;
}

const status = async (sid: string) => {
    if (!browser) return;
    const response = await axios.get('/api/statusbar/' + sid).catch()
    return response.data;
}

const serverGet = async (url: string, data: Record<string,any>, config: Record<string,any> = {}) => get(apiRoute + url, data, config);

const post = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}, method: 'post' | 'patch' | 'delete' = 'post', apiRoute: boolean = false) => {
    if (url.startsWith('//')) url = url.substring(1);
    if (!browser) return;
    config.headers = headers;
    const apiReq = setApiRequest(method.toUpperCase(), url, data)
    const response = await axios[method](url, data, config).catch(catchApiReqError(apiReq));
    if (response) {
        setApiResponse(response, apiReq);
        return response.data;
    }
}

const download = async (url: string, data: Record<string,any>, config: Record<string,any> = {}) => {
    if (url.startsWith('//')) url = url.substring(1);
    if (!browser) return;
    config.headers = headers;
    config.headers['x-api-download'] = 1;
    config.responseType = 'blob';
    const response = await axios.post(url, data, config).catch(err => err.response);
    return response;
}

const serverDownload = async (url: string, data: Record<string,any>, config: Record<string,any> = {}) => {
    if (url.startsWith('//')) url = url.substring(1);
    if (!browser) return;
    config.headers = headers;
    config.headers['x-api-download'] = 1;
    config.responseType = 'blob';
    // config.headers['X-Download-Link'] = 1;
    const response = await axios.post(apiRoute + url, data, config).catch(err => err.response);
    return response;
}

const patch = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}) => post(url, data, config, 'patch')

const del = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}, apiRoute: boolean = false) => {
    if (url.startsWith('//')) url = url.substring(1);
    if (!browser) return;
    config.params = data;
    config.headers = headers;
    const apiReq = setApiRequest('DELETE', url, data)
    const response = await axios.delete(url, config).catch(catchApiReqError(apiReq));
    if (response) {
        setApiResponse(response, apiReq);
        return response.data;
    }
}

const serverPost = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}, method: 'post' | 'patch' | 'delete' = 'post') => post(apiRoute + url, data, config, method).then(response => response.result);

const serverPatch = async (url: string, data: Record<string,any> = {}, config: Record<string,any> = {}) => serverPost(url, data, config, 'patch');

export const confirmSuccess = async (promise: Promise<Record<string,any>>, message = 'Dane zostały zapisane') => {
    const result = await promise;
    if (result?.success) addToast(message, 'success');
    return result;
}

export const server = {
    post: serverPost,
    get: serverGet,
    patch: serverPatch,
    download: serverDownload
}

export const internal = {
    get,
    post,
    patch,
    del,
    status,
    download,
    getApi: (data?: Record<string,any>) => get(window.location.pathname + '/api', data, {}, true),
    delApi: (data?: Record<string,any>) => del(window.location.pathname + '/api', data, {}, true),
    postApi: (data: Record<string,any>, method: 'post' | 'patch' | 'delete' = 'post', config: Record<string,any> = {}) => post(window.location.pathname + '/api', data, config, method, true)
}

export const roleRedirects = new Map([
    [ 'client', '/panel' ],
    [ 'admin', '/panel' ],
]);

export const hash = async (message: string, algo = 'SHA-256', salt = false) => {
    if (salt) message = salt + message;
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest(algo, msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    if (salt) return salt + hashHex;
    return hashHex;
}

export const checkServerVersion = async (browserVersion: string) => {
    const { version } = await internal.get('/api/version?t=' + Date.now());
    if (version !== browserVersion) {
        window.location.reload();
    }
}