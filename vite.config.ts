import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VIRTUAL_PAGEDJS = 'virtual:pagedjs-polyfill';

function pagedJsPolyfillPlugin() {
	return {
		name: 'pagedjs-polyfill-inline',
		resolveId: (id: string) => (id === VIRTUAL_PAGEDJS ? '\0' + VIRTUAL_PAGEDJS : null),
		load: (id: string) => {
			if (id !== '\0' + VIRTUAL_PAGEDJS) return null;
			const content = readFileSync(resolve('node_modules/pagedjs/dist/paged.polyfill.js'), 'utf-8');
			return `export default ${JSON.stringify(content)}`;
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), Icons({ compiler: 'svelte' }), pagedJsPolyfillPlugin()]
});
