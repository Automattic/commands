import type { Command } from './types';

/**
 * Groups a flat command array by the `group` field.
 *
 * Returns an ordered Map where each key is a group label (or `""` for ungrouped
 * commands) and each value is the subset of commands belonging to that group.
 * Insertion order matches the first appearance of each group in the input array.
 */
export function groupCommands( commands: Command[] ): Map< string, Command[] > {
	const groups = new Map< string, Command[] >();

	for ( const command of commands ) {
		const key = command.group ?? '';
		const bucket = groups.get( key );

		if ( bucket ) {
			bucket.push( command );
		} else {
			groups.set( key, [ command ] );
		}
	}

	return groups;
}
