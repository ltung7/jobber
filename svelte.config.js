import appengine from "svelte-adapter-appengine";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// vitePlugin: {
	// 	dynamicCompileOptions: ({ filename }) =>
	// 		filename.includes('node_modules') ? undefined : { runes: true }
	// },
	preprocess: vitePreprocess(),
	kit: {
		adapter: appengine({ 
			nodejsRuntime: 24,
		})
	}
};

export default config;
