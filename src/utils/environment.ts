export function isNonProductionEnvironment(): boolean {
	const nodeEnv = (
		globalThis as typeof globalThis & {
			process?: { env?: { NODE_ENV?: string } };
		}
	 ).process?.env?.NODE_ENV;

	return nodeEnv !== undefined && nodeEnv !== 'production';
}
