import { isNonProductionEnvironment } from './environment';

export function warnInNonProduction( ...args: unknown[] ): void {
	if ( ! isNonProductionEnvironment() ) {
		return;
	}

	// eslint-disable-next-line no-console
	console.warn( ...args );
}
