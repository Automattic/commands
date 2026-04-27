import type { CommandsProps } from './types';

export interface UnresolvedParam {
	/** The param name (e.g. "env") */
	name: string;
	/** When the resolver returns an array, these are the options the user can pick from */
	options?: string[];
}

export interface ResolveRouteResult {
	/** The route with resolved params replaced (unresolved ones stay as `:param`) */
	path: string;
	/** Params that still need a value, optionally with selectable options */
	unresolved: UnresolvedParam[];
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
 * 4. For each returned value:
 *    - string → replaces the placeholder in the path.
 *    - string[] → listed as unresolved with selectable options.
 *    - missing / echoed back → listed as unresolved without options.
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
		return {
			path: route,
			unresolved: paramNames.map( name => ( { name } ) ),
		};
	}

	const paramMap: Record< string, string > = {};
	for ( const name of paramNames ) {
		paramMap[ name ] = `:${ name }`;
	}

	const resolved = await resolver( paramMap );

	let path = route;
	const unresolved: UnresolvedParam[] = [];

	for ( const name of paramNames ) {
		const value = resolved[ name ];

		if ( Array.isArray( value ) ) {
			unresolved.push( { name, options: value } );
		} else if ( typeof value === 'string' && value !== `:${ name }` ) {
			path = path.replace( `:${ name }`, value );
		} else {
			unresolved.push( { name } );
		}
	}

	return { path, unresolved };
}
