import wpvip from '@automattic/eslint-plugin-wpvip';

export default [
	...wpvip.configs.recommended,
	{
		ignores: [ 'dist/', 'playground/', '*.config.ts', 'vitest.setup.ts' ],
	},
];
