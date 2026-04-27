import type { CommandsProps } from './types';

export interface ResolveRouteResult {
	/** The route with resolved params replaced */
	path: string;
	/** Param names that the resolver did not provide values for */
	unresolved: string[];
}

const PARAM_PATTERN = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Extracts `:param` names from a route string.
 *
 * Given `"/apps/:appId/:env/logs"` returns `["appId", "env"]`.
 * Routes with no params return an empty array.
 */
export function extractParams( route: string ): string[] {
	return Array.from( route.matchAll( PARAM_PATTERN ), match => match[ 1 ] );
}

/**
 * Resolves route parameters by calling the provided resolver.
 *
 * 1. Extracts all `:param` patterns from the route.
 * 2. If no params exist, returns the route unchanged.
 * 3. Calls the resolver with a `{ param: ":param" }` map.
 * 4. Replaces each `:param` with the resolver's value.
 * 5. Params the resolver didn't resolve are listed in `unresolved`.
 */
export async function resolveRoute(
	route: string,
	resolver?: CommandsProps[ 'resolver' ]
): Promise< ResolveRouteResult > {
	const paramNames = extractParams( route );

	if ( paramNames.length === 0 ) {
		return { path: route, unresolved: [] };
	}

	if ( ! resolver ) {
		return { path: route, unresolved: paramNames };
	}

	const paramMap: Record< string, string > = {};
	for ( const name of paramNames ) {
		paramMap[ name ] = `:${ name }`;
	}

	const resolved = await resolver( paramMap );

	let path = route;
	const unresolved: string[] = [];

	for ( const name of paramNames ) {
		const value = resolved[ name ];
		if ( value !== undefined && value !== `:${ name }` ) {
			path = path.replace( `:${ name }`, value );
		} else {
			unresolved.push( name );
		}
	}

	return { path, unresolved };
}
