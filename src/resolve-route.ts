import { warnInNonProduction } from './utils/logging';

import type { CommandsProps, ResolveRouteResult } from './types';

const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)(?=[/?#]|$)/g;

/**
 * Extracts `:param` names from a route string.
 *
 * Given `"/apps/:appId/:env/logs"` returns `["appId", "env"]`.
 * Routes with no params return an empty array.
 */
export function extractParams( route: string ): string[] {
	const params = new Set< string >();

	for ( const match of route.matchAll( PARAM_PATTERN ) ) {
		params.add( match[ 1 ] );
	}

	return Array.from( params );
}

/**
 * Replaces a single named route parameter with a value, safely handling
 * overlapping names (e.g. `:app` vs `:appId`).
 */
export function replaceRouteParam( route: string, name: string, value: string ): string {
	return route.replace( PARAM_PATTERN, ( match, paramName: string ) =>
		paramName === name ? value : match
	);
}

/**
 * Resolves route parameters by calling the provided resolver once per param.
 *
 * 1. Extracts all `:param` patterns from the route.
 * 2. If no params exist, returns the route unchanged.
 * 3. Calls the resolver for each param in left-to-right order, passing
 *    the param name and accumulated selections (auto-resolved values +
 *    previously-selected values).
 * 4. For each returned value:
 *    - string → replaces the placeholder in the path and continues.
 *    - string[] → stops and lists that param as unresolved with options,
 *      plus any remaining params as unresolved without options.
 *    - anything else → stops and lists that param plus remaining params as
 *      unresolved without options.
 */
export async function resolveRoute(
	route: string,
	resolver?: CommandsProps[ 'resolver' ],
	selections: Record< string, string > = {},
	search: string = ''
): Promise< ResolveRouteResult > {
	const paramNames = extractParams( route );

	if ( paramNames.length === 0 ) {
		return { path: route, unresolved: [], selections };
	}

	if ( ! resolver ) {
		return {
			path: route,
			unresolved: paramNames.map( name => ( { name } ) ),
			selections,
		};
	}

	let path = route;
	const accumulated = { ...selections };

	for ( const [ idx, name ] of paramNames.entries() ) {
		// eslint-disable-next-line no-await-in-loop -- sequential resolution is intentional
		const value = await resolver( name, accumulated, search );

		if ( typeof value === 'string' ) {
			path = replaceRouteParam( path, name, value );
			// eslint-disable-next-line security/detect-object-injection
			accumulated[ name ] = value;
		} else if ( Array.isArray( value ) ) {
			const remaining = paramNames.slice( idx + 1 ).map( rest => ( { name: rest } ) );
			return {
				path,
				unresolved: [ { name, options: value }, ...remaining ],
				selections: accumulated,
			};
		} else {
			warnInNonProduction(
				`[@automattic/commands] Resolver returned an unsupported value for ":${ name }".`,
				value
			);
			const remaining = paramNames.slice( idx + 1 ).map( rest => ( { name: rest } ) );
			return {
				path,
				unresolved: [ { name }, ...remaining ],
				selections: accumulated,
			};
		}
	}

	return { path, unresolved: [], selections: accumulated };
}
