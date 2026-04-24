import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cmd } from '../test-utils';
import { useRecentCommands } from './use-recent-commands';

import type { Command } from '../types';

const DEFAULT_KEY = '@automattic/commands:recent';

const allCommands: Command[] = [
	cmd( { id: 'a', title: 'A' } ),
	cmd( { id: 'b', title: 'B' } ),
	cmd( { id: 'c', title: 'C' } ),
	cmd( { id: 'd', title: 'D' } ),
	cmd( { id: 'e', title: 'E' } ),
	cmd( { id: 'f', title: 'F' } ),
];

const [ commandA, commandB, commandC, commandD, commandE, commandF ] = allCommands;

function readStorageKey( key = DEFAULT_KEY ): unknown {
	const raw = window.localStorage.getItem( key );
	return raw ? ( JSON.parse( raw ) as unknown ) : null;
}

describe( 'useRecentCommands', () => {
	beforeEach( () => {
		window.localStorage.clear();
	} );

	afterEach( () => {
		vi.restoreAllMocks();
	} );

	it( 'starts with an empty recent list when storage is empty', () => {
		const { result } = renderHook( () => useRecentCommands( allCommands ) );
		expect( result.current.recent ).toEqual( [] );
	} );

	it( 'prepends a new entry on addRecent and persists to localStorage', () => {
		vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );
		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		act( () => {
			result.current.addRecent( 'b' );
		} );

		expect( result.current.recent ).toEqual( [ commandB ] );
		expect( readStorageKey() ).toEqual( [ { id: 'b', timestamp: 1000 } ] );
	} );

	it( 'prepends newest first across multiple additions', () => {
		const now = vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );
		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		act( () => {
			result.current.addRecent( 'a' );
		} );
		now.mockReturnValue( 2000 );
		act( () => {
			result.current.addRecent( 'b' );
		} );
		now.mockReturnValue( 3000 );
		act( () => {
			result.current.addRecent( 'c' );
		} );

		expect( result.current.recent ).toEqual( [ commandC, commandB, commandA ] );
	} );

	it( 'deduplicates: re-adding an existing id moves it to the front with a new timestamp', () => {
		const now = vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );
		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		act( () => {
			result.current.addRecent( 'a' );
		} );
		now.mockReturnValue( 2000 );
		act( () => {
			result.current.addRecent( 'b' );
		} );
		now.mockReturnValue( 3000 );
		act( () => {
			result.current.addRecent( 'a' );
		} );

		expect( result.current.recent ).toEqual( [ commandA, commandB ] );
	} );

	it( 'enforces the configured limit, dropping the oldest entries', () => {
		const now = vi.spyOn( Date, 'now' ).mockReturnValue( 0 );
		const { result } = renderHook( () => useRecentCommands( allCommands, { limit: 3 } ) );

		[ 'a', 'b', 'c', 'd', 'e' ].forEach( ( id, index ) => {
			now.mockReturnValue( ( index + 1 ) * 1000 );
			act( () => {
				result.current.addRecent( id );
			} );
		} );

		expect( result.current.recent ).toEqual( [ commandE, commandD, commandC ] );
	} );

	it( 'defaults the limit to 5', () => {
		const now = vi.spyOn( Date, 'now' ).mockReturnValue( 0 );
		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		[ 'a', 'b', 'c', 'd', 'e', 'f' ].forEach( ( id, index ) => {
			now.mockReturnValue( ( index + 1 ) * 1000 );
			act( () => {
				result.current.addRecent( id );
			} );
		} );

		expect( result.current.recent ).toHaveLength( 5 );
		expect( result.current.recent ).toEqual( [ commandF, commandE, commandD, commandC, commandB ] );
	} );

	it( 'defaults the storage key to @automattic/commands:recent', () => {
		vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );
		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		act( () => {
			result.current.addRecent( 'a' );
		} );

		expect( readStorageKey( '@automattic/commands:recent' ) ).toEqual( [
			{ id: 'a', timestamp: 1000 },
		] );
	} );

	it( 'writes under a custom storage key', () => {
		vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );
		const { result } = renderHook( () =>
			useRecentCommands( allCommands, { storageKey: 'custom-key' } )
		);

		act( () => {
			result.current.addRecent( 'a' );
		} );

		expect( readStorageKey( 'custom-key' ) ).toEqual( [ { id: 'a', timestamp: 1000 } ] );
		expect( readStorageKey( DEFAULT_KEY ) ).toBeNull();
	} );

	it( 'reads the existing recent list from localStorage on mount', () => {
		window.localStorage.setItem(
			DEFAULT_KEY,
			JSON.stringify( [
				{ id: 'c', timestamp: 3000 },
				{ id: 'a', timestamp: 1000 },
			] )
		);

		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		expect( result.current.recent ).toEqual( [ commandC, commandA ] );
	} );

	it( 'does not let stale entries crowd out valid ones against the limit on addRecent', () => {
		window.localStorage.setItem(
			DEFAULT_KEY,
			JSON.stringify( [
				{ id: 'stale-1', timestamp: 5000 },
				{ id: 'a', timestamp: 4000 },
				{ id: 'stale-2', timestamp: 3000 },
				{ id: 'b', timestamp: 2000 },
				{ id: 'stale-3', timestamp: 1000 },
			] )
		);
		vi.spyOn( Date, 'now' ).mockReturnValue( 6000 );

		const { result } = renderHook( () => useRecentCommands( allCommands, { limit: 3 } ) );

		act( () => {
			result.current.addRecent( 'c' );
		} );

		expect( result.current.recent ).toEqual( [ commandC, commandA, commandB ] );
		expect( readStorageKey() ).toEqual( [
			{ id: 'c', timestamp: 6000 },
			{ id: 'a', timestamp: 4000 },
			{ id: 'b', timestamp: 2000 },
		] );
	} );

	it( 'prunes stale entries (ids not in the current commands array) on read', () => {
		window.localStorage.setItem(
			DEFAULT_KEY,
			JSON.stringify( [
				{ id: 'gone', timestamp: 3000 },
				{ id: 'a', timestamp: 2000 },
				{ id: 'also-gone', timestamp: 1000 },
			] )
		);

		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		expect( result.current.recent ).toEqual( [ commandA ] );
	} );

	it.each( [
		[ 'malformed JSON', 'not json', [] ],
		[ 'non-array payload', JSON.stringify( { oops: true } ), [] ],
		[
			'array with malformed entries',
			JSON.stringify( [
				{ id: 'a', timestamp: 1000 },
				{ id: 'b' },
				{ timestamp: 2000 },
				null,
				'nope',
			] ),
			[ commandA ],
		],
	] )( 'handles %s in storage', ( _label, payload, expected ) => {
		window.localStorage.setItem( DEFAULT_KEY, payload );

		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		expect( result.current.recent ).toEqual( expected );
	} );

	it( 'falls back to an empty list when localStorage.getItem throws', () => {
		vi.spyOn( Storage.prototype, 'getItem' ).mockImplementation( () => {
			throw new Error( 'denied' );
		} );

		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		expect( result.current.recent ).toEqual( [] );
	} );

	it( 'swallows localStorage.setItem failures and keeps state in-memory', () => {
		vi.spyOn( Storage.prototype, 'setItem' ).mockImplementation( () => {
			throw new Error( 'quota' );
		} );
		vi.spyOn( Date, 'now' ).mockReturnValue( 1000 );

		const { result } = renderHook( () => useRecentCommands( allCommands ) );

		expect( () => {
			act( () => {
				result.current.addRecent( 'a' );
			} );
		} ).not.toThrow();

		expect( result.current.recent ).toEqual( [ commandA ] );
	} );

	it( 're-reads storage when storageKey changes', () => {
		window.localStorage.setItem( 'key-one', JSON.stringify( [ { id: 'a', timestamp: 1000 } ] ) );
		window.localStorage.setItem( 'key-two', JSON.stringify( [ { id: 'b', timestamp: 2000 } ] ) );

		const { result, rerender } = renderHook(
			( { storageKey }: { storageKey: string } ) =>
				useRecentCommands( allCommands, { storageKey } ),
			{ initialProps: { storageKey: 'key-one' } }
		);

		expect( result.current.recent ).toEqual( [ commandA ] );

		rerender( { storageKey: 'key-two' } );

		expect( result.current.recent ).toEqual( [ commandB ] );
	} );
} );
