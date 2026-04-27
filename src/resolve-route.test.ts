import { describe, it, expect } from 'vitest';

import { extractParams, resolveRoute } from './resolve-route';

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
} );

/* ---------- resolveRoute ---------- */

describe( 'resolveRoute', () => {
	it( 'passes routes with no params through unchanged', async () => {
		const result = await resolveRoute( '/home' );
		expect( result ).toEqual( { path: '/home', unresolved: [] } );
	} );

	it( 'resolves a single param via a sync resolver', async () => {
		const resolver = ( params: Record< string, string > ) => {
			expect( params ).toEqual( { appId: ':appId' } );
			return { appId: '42' };
		};

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( { path: '/apps/42', unresolved: [] } );
	} );

	it( 'resolves multiple params via a sync resolver', async () => {
		const resolver = () => ( { appId: '42', env: 'production' } );

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/production/logs',
			unresolved: [],
		} );
	} );

	it( 'resolves params via an async resolver', async () => {
		const resolver = () => Promise.resolve( { appId: '99' } );

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( { path: '/apps/99', unresolved: [] } );
	} );

	it( 'reports unresolved params when resolver returns partial values', async () => {
		const resolver = () => ( { appId: '42' } );

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/:env/logs',
			unresolved: [ { name: 'env' } ],
		} );
	} );

	it( 'reports all params as unresolved when no resolver is provided', async () => {
		const result = await resolveRoute( '/apps/:appId/:env/logs' );
		expect( result ).toEqual( {
			path: '/apps/:appId/:env/logs',
			unresolved: [ { name: 'appId' }, { name: 'env' } ],
		} );
	} );

	it( 'treats a param echoed back unchanged as unresolved', async () => {
		const resolver = () => ( { appId: ':appId' } );

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId',
			unresolved: [ { name: 'appId' } ],
		} );
	} );

	it( 'handles a resolver that returns an empty object', async () => {
		const resolver = () => ( {} );

		const result = await resolveRoute( '/apps/:appId', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId',
			unresolved: [ { name: 'appId' } ],
		} );
	} );

	/* --- options support --- */

	it( 'reports options when resolver returns an array for a param', async () => {
		const resolver = () => ( {
			appId: '42',
			env: [ 'production', 'staging', 'development' ],
		} );

		const result = await resolveRoute( '/apps/:appId/:env/logs', resolver );
		expect( result ).toEqual( {
			path: '/apps/42/:env/logs',
			unresolved: [ { name: 'env', options: [ 'production', 'staging', 'development' ] } ],
		} );
	} );

	it( 'reports multiple params with options', async () => {
		const resolver = () => ( {
			appId: [ 'app-one', 'app-two' ],
			env: [ 'production', 'staging' ],
		} );

		const result = await resolveRoute( '/apps/:appId/:env', resolver );
		expect( result ).toEqual( {
			path: '/apps/:appId/:env',
			unresolved: [
				{ name: 'appId', options: [ 'app-one', 'app-two' ] },
				{ name: 'env', options: [ 'production', 'staging' ] },
			],
		} );
	} );

	it( 'mixes resolved values and options in a single call', async () => {
		const resolver = () => ( {
			appId: 'my-app',
			env: [ 'prod', 'dev' ],
		} );

		const result = await resolveRoute( '/apps/:appId/:env/audit', resolver );
		expect( result ).toEqual( {
			path: '/apps/my-app/:env/audit',
			unresolved: [ { name: 'env', options: [ 'prod', 'dev' ] } ],
		} );
	} );
} );
