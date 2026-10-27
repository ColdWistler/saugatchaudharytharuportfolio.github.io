import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://saugatchaudharytharu.com.np/',
	output: 'static',
	build: {
		client: 'public',
		server: 'dist',
	},
	vite: {
		// Keep the existing CSS and JS as static assets
		build: {
			assetsDir: 'assets',
		},
	},
});
