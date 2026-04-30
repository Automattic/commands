import { isNonProductionEnvironment } from './utils/environment';
import { warnInNonProduction } from './utils/logging';

import type { Command } from './types';

/**
 * Validates an array of command definitions at runtime.
 *
 * Each invalid entry produces a `console.warn` describing the problem, including
 * the offending command ID when available.
 * Only runs in non-production environments when the environment can be
 * determined at runtime.
 *
 * The input type is `Partial< Command >[]` so that runtime checks remain
 * meaningful for plain-JS consumers and dynamic data (e.g. JSON configs).
 */
export function validateCommands( commands: Partial< Command >[] ): void {
	if ( ! isNonProductionEnvironment() ) {
		return;
	}

	const seenIds = new Set< string >();

	for ( const command of commands ) {
		const id = command.id;

		if ( typeof id !== 'string' || id.length === 0 ) {
			warnInNonProduction(
				`[@automattic/commands] Command has an empty or missing "id".`,
				command
			);
		}

		if ( typeof command.title !== 'string' || command.title.length === 0 ) {
			warnInNonProduction(
				`[@automattic/commands] Command "${ id }" has an empty or missing "title".`
			);
		}

		if ( typeof id === 'string' && id.length > 0 ) {
			if ( seenIds.has( id ) ) {
				warnInNonProduction( `[@automattic/commands] Duplicate command id "${ id }".` );
			}
			seenIds.add( id );
		}

		const hasRoute = typeof command.route === 'string' && command.route.length > 0;
		const hasAction = typeof command.action === 'function';

		if ( ! hasRoute && ! hasAction ) {
			warnInNonProduction(
				`[@automattic/commands] Command "${ id }" must have either "route" or "action".`
			);
		}

		if ( hasRoute && hasAction ) {
			warnInNonProduction(
				`[@automattic/commands] Command "${ id }" must not have both "route" and "action".`
			);
		}
	}
}
