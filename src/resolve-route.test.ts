import { describe, it, expect, afterEach, vi } from 'vitest';

import { extractParams, replaceRouteParam, resolveRoute } from './resolve-route';

import type { ResolvedParam } from './types';

afterEach( () => {
	vi.restoreAllMocks();
} );

/* ---------- extractParams ---------- */

describe( 'extractParams', () => {
	it( 'returns an empty array for a route with no params', () => {
		expect( extractParams( '/home' ) ).toEqual( [] );
	} );

	it( 'extracts a single param', () => {
		expect( extractParams( '/apps/:appId' ) ).toEqual( [ 'appId' ] );
	} );

	it( 'extracts multiple params', () => {
		expect( extractParams( '/apps/:appId/:env/logs' ) ).toEqual( [ 'appId', 'env' ] );
	} );

	it( 'handles params with underscores', () => {
		expect( extractParams( '/users/:user_id/posts/:post_id' ) ).toEqual( [ 'user_id', 'post_id' ] );
	} );

	it( 'returns an empty array for an empty string', () => {
		expect( extractParams( '' ) ).toEqual( [] );
	} );

	it( 'deduplicates repeated param names', () => {
		expect( extractParams( '/apps/:appId/compare/:appId' ) ).toEqual( [ 'appId' ] );
	} );
} );

/* ---------- replaceRouteParam ---------- */

describe( 'replaceRouteParam', () => {
	it( 'replaces a single param occurrence', () => {
		expect( replaceRouteParam( '/apps/:appId/logs', 'appId', '42' ) ).toBe( '/apps/42/logs' );
	} );

	it( 'replaces all occurrences of the same param', () => {
		expect( replaceRouteParam( '/apps/:appId/compare/:appId', 'appId', '42' ) ).toBe(
			'/apps/42/compare/42'
		);
	} );

	it( 'does not corrupt overlapping param names', () => {
		expect( replaceRouteParam( '/apps/:app/:appId', 'app', 'myapp' ) ).toBe( '/apps/myapp/:appId' );
	} );

	it( 'leaves other params untouched', () => {
		expect( replaceRouteParam( '/apps/:appId/:env', 'env', 'prod' ) ).toBe( '/apps/:appId/prod' );
	} );

	it( 'handles params at the end of the route', () => {
		expect( replaceRouteParam( '/apps/:appId', 'appId', '7' ) ).toBe( '/apps/7' );
	} );
} );

/* ---------- resolveRoute ---------- */

describe( 'resolveRoute', () => {
	it( 'passes routes with no params through unchanged', async () => {
		const result = await resolveRoute( '/home' );
		expect( result ).toEqual( { path: '/home', unresolved: [], selections: {} } );
	} );

	it( 'resolves a single param via a sync resolver', async () => {
		const resolver = ( param: string ) => {
			expect( param ).toBe( 'appId' );
			return '42';
		};

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( { path: '/apps/42', unresolved: [], selections: { appId: '42' } } );
	} );

	it( 'resolves multiple params via a sync resolver', async () => {
		const resolver = ( param: string ) => {
			if ( param === 'appId' ) {
				return '42';
			}
			return 'production';
		};

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/production/logs',
			unresolved: [],
			selections: { appId: '42', env: 'production' },
		} );
	} );

	it( 'resolves params via an async resolver', async () => {
		const resolver = () => Promise.resolve( '99' );

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( {
			path: '/apps/99',
			unresolved: [],
			selections: { appId: '99' },
		} );
	} );

	it( 'reports all params as unresolved when no resolver is provided', async () => {
		const result = await resolveRoute( '/apps/:appId/:env/logs' );
		expect( result ).toEqual( {
			path: '/apps/:appId/:env/logs',
			unresolved: [ { name: 'appId' }, { name: 'env' } ],
			selections: {},
		} );
	} );

	it( 'reports a param as unresolved when the resolver returns undefined', async () => {
		vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const resolver = ( param: string ) => {
			if ( param === 'appId' ) {
				return '42';
			}
			return undefined as unknown as ResolvedParam;
		};

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/:env/logs',
			unresolved: [ { name: 'env' } ],
			selections: { appId: '42' },
		} );
	} );

	it( 'reports params as unresolved when the resolver returns a non-string non-array value', async () => {
		vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
		const unsupportedValue = { appId: '42' };
		const resolver = () => unsupportedValue as unknown as ResolvedParam;

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId/:env/logs',
			unresolved: [ { name: 'appId' }, { name: 'env' } ],
			selections: {},
		} );
	} );

	it( 'does not corrupt overlapping param names during resolution', async () => {
		const resolver = ( param: string ) => {
			if ( param === 'app' ) {
				return 'myapp';
			}
			return [ 'id-1', 'id-2' ];
		};

		const result = await resolveRoute( '/apps/:app/:appId', resolver );
		expect( result ).toEqual( {
			path: '/apps/myapp/:appId',
			unresolved: [ { name: 'appId', options: [ 'id-1', 'id-2' ] } ],
			selections: { app: 'myapp' },
		} );
	} );

	/* --- options support --- */

	it( 'reports options when resolver returns an array for a param', async () => {
		const resolver = ( param: string ) => {
			if ( param === 'appId' ) {
				return '42';
			}
			return [ 'production', 'staging', 'development' ];
		};

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/:env/logs',
			unresolved: [ { name: 'env', options: [ 'production', 'staging', 'development' ] } ],
			selections: { appId: '42' },
		} );
	} );

	it( 'stops at first array and lists remaining params as unresolved', async () => {
		const resolver = () => [ 'app-one', 'app-two' ];

		const result = await resolveRoute( '/apps/:appId/:env', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId/:env',
			unresolved: [ { name: 'appId', options: [ 'app-one', 'app-two' ] }, { name: 'env' } ],
			selections: {},
		} );
	} );

	it( 'auto-resolves string params then stops at an array param', async () => {
		const resolver = ( param: string ) => {
			if ( param === 'appId' ) {
				return 'my-app';
			}
			return [ 'prod', 'dev' ];
		};

		const result = await resolveRoute( '/apps/:appId/:env/audit', resolver );
		expect( result ).toEqual( {
			path: '/apps/my-app/:env/audit',
			unresolved: [ { name: 'env', options: [ 'prod', 'dev' ] } ],
			selections: { appId: 'my-app' },
		} );
	} );

	/* --- selections support --- */

	it( 'passes an empty selections object by default', async () => {
		const resolver = ( param: string, selections: Record< string, string > ) => {
			expect( selections ).toEqual( {} );
			return '42';
		};

		await resolveRoute( '/apps/:appId', resolver );
	} );

	it( 'forwards caller-provided selections to the resolver', async () => {
		const resolver = ( param: string, selections: Record< string, string > ) => {
			expect( param ).toBe( 'env' );
			expect( selections ).toEqual( { appId: 'my-app' } );
			return [ 'prod', 'staging' ];
		};

		const result = await resolveRoute( '/apps/my-app/:env/audit', resolver, {
			appId: 'my-app',
		} );
		expect( result ).toEqual( {
			path: '/apps/my-app/:env/audit',
			unresolved: [ { name: 'env', options: [ 'prod', 'staging' ] } ],
			selections: { appId: 'my-app' },
		} );
	} );

	it( 'accumulates auto-resolved values into selections for subsequent params', async () => {
		const calls: Array< [ string, Record< string, string > ] > = [];
		const resolver = ( param: string, selections: Record< string, string > ) => {
			calls.push( [ param, { ...selections } ] );
			if ( param === 'appId' ) {
				return 'my-app';
			}
			return [ 'prod', 'staging' ];
		};

		await resolveRoute( '/apps/:appId/:env/logs', resolver );

		expect( calls ).toEqual( [
			[ 'appId', {} ],
			[ 'env', { appId: 'my-app' } ],
		] );
	} );

	/* --- labeled value support --- */

	it( 'reports labeled-value options when resolver returns { label, value } objects', async () => {
		const resolver = () => [
			{ label: 'My App', value: '42' },
			{ label: 'Other App', value: '99' },
		];

		const result = await resolveRoute( '/apps/:appId/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId/logs',
			unresolved: [
				{
					name: 'appId',
					options: [
						{ label: 'My App', value: '42' },
						{ label: 'Other App', value: '99' },
					],
				},
			],
			selections: {},
		} );
	} );

	it( 'supports mixed string and labeled-value options', async () => {
		const resolver = () => [ 'plain', { label: 'Labeled', value: 'lbl' } ];

		const result = await resolveRoute( '/items/:id', resolver );
		expect( result ).toEqual( {
			path: '/items/:id',
			unresolved: [
				{
					name: 'id',
					options: [ 'plain', { label: 'Labeled', value: 'lbl' } ],
				},
			],
			selections: {},
		} );
	} );

	/* --- search parameter support --- */

	it( 'passes an empty search string by default', async () => {
		const resolver = ( _param: string, _selections: Record< string, string >, search: string ) => {
			expect( search ).toBe( '' );
			return '42';
		};

		await resolveRoute( '/apps/:appId', resolver );
	} );

	it( 'forwards the search parameter to the resolver', async () => {
		const resolver = vi.fn().mockReturnValue( [ 'a', 'b' ] );

		await resolveRoute( '/apps/:appId', resolver, {}, 'my query' );

		expect( resolver ).toHaveBeenCalledWith( 'appId', {}, 'my query' );
	} );
} );
