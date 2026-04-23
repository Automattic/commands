import type { Command } from './types';

/**
 * Validates an array of command definitions at runtime.
 *
 * Each invalid entry produces a `console.warn` describing the problem, including
 * the offending command ID when available.
 * Only runs when `process.env.NODE_ENV !== 'production'`.
 *
 * The input type is `Partial< Command >[]` so that runtime checks remain
 * meaningful for plain-JS consumers and dynamic data (e.g. JSON configs).
 */
export function validateCommands( commands: Partial< Command >[] ): void {
	if ( typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ) {
		return;
	}

	const seenIds = new Set< string >();

	for ( const command of commands ) {
		const id = command.id;

		if ( typeof id !== 'string' || id.length === 0 ) {
			// eslint-disable-next-line no-console
			console.warn( `[@automattic/commands] Command has an empty or missing "id".`, command );
		}

		if ( typeof command.title !== 'string' || command.title.length === 0 ) {
			// eslint-disable-next-line no-console
			console.warn( `[@automattic/commands] Command "${ id }" has an empty or missing "title".` );
		}

		if ( id && seenIds.has( id ) ) {
			// eslint-disable-next-line no-console
			console.warn( `[@automattic/commands] Duplicate command id "${ id }".` );
		}
		if ( id ) {
			seenIds.add( id );
		}

		const hasRoute = command.route !== undefined;
		const hasAction = command.action !== undefined;

		if ( ! hasRoute && ! hasAction ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[@automattic/commands] Command "${ id }" must have either "route" or "action".`
			);
		}

		if ( hasRoute && hasAction ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[@automattic/commands] Command "${ id }" must not have both "route" and "action".`
			);
		}
	}
}
