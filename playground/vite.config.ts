import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig( {
	plugins: [ react() ],
	root: __dirname,
	resolve: {
		alias: {
			'@automattic/commands': path.resolve( __dirname, '../dist/index.js' ),
		},
	},
} );
