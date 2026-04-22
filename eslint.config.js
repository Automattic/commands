import wpvip from '@automattic/eslint-plugin-wpvip';

export default [
	...wpvip.configs.recommended,
	{
		files: [ 'playground/**/*.{ts,tsx}' ],
		rules: {
			'no-console': 'off',
		},
	},
	{
		ignores: [ 'dist/' ],
	},
];
