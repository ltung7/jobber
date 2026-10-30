import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'dist-trello-mcp');
fs.mkdirSync(outDir, { recursive: true });

// Plugin to resolve SvelteKit virtual modules ($env/*, $lib/*) without pulling in the whole SvelteKit app
const minimalMcpPlugin = {
    name: 'minimal-trello-mcp-sveltekit-shim',
    setup(build) {
        // Shim $env/dynamic/private and $env/dynamic/public -> process.env
        build.onResolve({ filter: /^\$env\/dynamic\/(private|public)$/ }, args => ({
            path: args.path,
            namespace: 'env-dynamic-ns'
        }));
        build.onLoad({ filter: /.*/, namespace: 'env-dynamic-ns' }, () => ({
            contents: `export const env = process.env;`,
            loader: 'js'
        }));

        // Shim $env/static/public for firebase.ts
        build.onResolve({ filter: /^\$env\/static\/public$/ }, args => ({
            path: args.path,
            namespace: 'env-static-public-ns'
        }));
        build.onLoad({ filter: /.*/, namespace: 'env-static-public-ns' }, () => ({
            contents: `
                export const PUBLIC_FIREBASE_PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || 'eisg-fleet';
                export const PUBLIC_FIREBASE_REALTIME_URL = process.env.PUBLIC_FIREBASE_REALTIME_URL || 'https://eisg-fleet-default-rtdb.europe-west1.firebasedatabase.app';
                export const PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'eisg-fleet.firebasestorage.app';
                export const PUBLIC_FIREBASE_APIKEY = process.env.PUBLIC_FIREBASE_APIKEY || 'AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M';
                export const PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'eisg-fleet.firebaseapp.com';
            `,
            loader: 'js'
        }));

        // Shim $lib/utils/logger so firebase.ts does not pull in Slack or SvelteKit UI services
        build.onResolve({ filter: /^\$lib\/utils\/logger$/ }, args => ({
            path: args.path,
            namespace: 'minimal-logger-ns'
        }));
        build.onLoad({ filter: /.*/, namespace: 'minimal-logger-ns' }, () => ({
            contents: `
                export const logger = {
                    log: (...args) => console.log(...args),
                    warn: (...args) => console.warn(...args),
                    error: (...args) => console.error(...args),
                    success: (...args) => console.log(...args),
                    gray: (...args) => console.log(...args)
                };
            `,
            loader: 'js'
        }));

        // Resolve $lib/* to src/lib/*
        build.onResolve({ filter: /^\$lib\// }, args => {
            const rel = args.path.replace(/^\$lib\//, 'src/lib/');
            const fullBase = path.resolve(process.cwd(), rel);
            for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
                if (fs.existsSync(fullBase + ext) && fs.statSync(fullBase + ext).isFile()) {
                    return { path: fullBase + ext };
                }
            }
            return { path: fullBase };
        });
    }
};

await esbuild.build({
    entryPoints: ['src/trello-mcp-runner.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    outfile: path.join(outDir, 'server.mjs'),
    external: [
        '@modelcontextprotocol/sdk',
        '@modelcontextprotocol/sdk/*',
        'axios',
        'firebase-admin',
        'firebase-admin/*',
        'zod'
    ],
    plugins: [minimalMcpPlugin],
    logLevel: 'info'
});

// Write minimal package.json with ONLY the 4 runtime dependencies needed by the MCP runner
const pkgPath = fs.existsSync('root-package.json') ? 'root-package.json' : 'package.json';
const rootPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const minimalPkg = {
    name: 'trello-card-assignment-mcp-runner',
    private: true,
    version: rootPkg.version || '1.0.0',
    type: 'module',
    scripts: {
        start: 'node server.mjs'
    },
    dependencies: {
        '@modelcontextprotocol/sdk': rootPkg.dependencies['@modelcontextprotocol/sdk'] || '^1.6.1',
        axios: rootPkg.dependencies['axios'] || '^1.7.9',
        'firebase-admin': rootPkg.dependencies['firebase-admin'] || '^13.1.0',
        zod: rootPkg.dependencies['zod'] || '^3.24.2'
    }
};

fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(minimalPkg, null, 2));
console.log('Successfully built minimal Trello MCP bundle to dist-trello-mcp/server.mjs');
