import { defineConfig } from 'tsup';

export default defineConfig( {
	entry: [ 'src/index.ts' ],
	format: [ 'esm', 'cjs' ],
	dts: true,
	sourcemap: true,
	clean: true,
	external: [ 'react', 'react-dom' ],
	tsconfig: './tsconfig.build.json',
	// Keep `import './theme.css'` in emitted JS so app bundlers load styles
	// when consumers import `@automattic/commands` (default CSS loader extracts
	// CSS to a file and drops the import from JS).
	loader: { '.css': 'copy' },
	esbuildOptions( options ) {
		// Avoid content-hashed filenames so `package.json#exports["./style.css"]` stays stable.
		options.assetNames = '[name]';
	},
} );
