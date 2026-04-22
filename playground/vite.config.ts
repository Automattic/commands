import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );

export default defineConfig( {
	plugins: [ react() ],
	root: __dirname,
	resolve: {
		alias: {
			'@automattic/commands': new URL( '../dist/index.js', import.meta.url ).pathname,
		},
	},
} );
