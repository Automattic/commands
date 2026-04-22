import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );

export default defineConfig( ( { mode } ) => ( {
	plugins: [ react() ],
	root: __dirname,
	resolve: {
		alias: {
			'@automattic/commands': fileURLToPath(
				new URL( mode === 'dist' ? '../dist/index.js' : '../src/index.ts', import.meta.url )
			),
		},
	},
} ) );
