import axios from 'axios'
import inspect from './sc/inspect.js'
import { createHash } from 'crypto';

const url = 'http://localhost:5173/api/test';

const test = process.argv[2] ?? 'get';

function hash(text, algo = 'sha256', result = 'hex') {
    if (!text) throw new Error('Invalid text');
    return createHash(algo).update(text).digest(result);
}

switch (test) {
    case 'hashpanel': {
        const panel = process.argv[3] ?? 5173;
        const dateComponent = (new Date()).toISOString().substring(5, 10);
        const hashed = hash([ 'app', 'app', dateComponent, panel ].join('/'), 'sha1').substring(6, 12);
        inspect({ hashed, url: `http://localhost:5173/app/app-${hashed}-${panel}/panel` })
        break;
    }
    case 'get': axios.get(url).then(response => inspect(response.data)).catch(err => console.error(err.response?.data?.message ?? err.message)); break;
    case 'post': axios.post(url, {}).then(response => inspect(response.data)).catch(err => console.error(err.response?.data?.message ?? err.message)); break;
    case 'del': axios.delete(url).then(response => inspect(response.data)).catch(err => console.error(err.response?.data?.message ?? err.message)); break;
    case 'reset': {
        axios.delete(url).then(() => {
            axios.post(url, {}).then(response => inspect(response.data)).catch(err => console.error(err.response?.data?.message ?? err.message));
        }).catch(err => console.error(err.response?.data?.message ?? err.message)); break;
    }
}