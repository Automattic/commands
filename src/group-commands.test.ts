import { describe, it, expect } from 'vitest';

import { groupCommands } from './group-commands';
import { cmd } from './test-utils';

describe( 'groupCommands', () => {
	it( 'returns an empty map for an empty array', () => {
		expect( groupCommands( [] ).size ).toBe( 0 );
	} );

	it( 'groups commands by the group field', () => {
		const commands = [
			cmd( { id: 'a', title: 'A', group: 'Pages' } ),
			cmd( { id: 'b', title: 'B', group: 'Actions' } ),
			cmd( { id: 'c', title: 'C', group: 'Pages' } ),
		];

		const grouped = groupCommands( commands );

		expect( grouped.size ).toBe( 2 );
		expect( grouped.get( 'Pages' )?.map( item => item.id ) ).toEqual( [ 'a', 'c' ] );
		expect( grouped.get( 'Actions' )?.map( item => item.id ) ).toEqual( [ 'b' ] );
	} );

	it( 'puts ungrouped commands under the empty-string key', () => {
		const commands = [ cmd( { id: 'a', title: 'A' } ), cmd( { id: 'b', title: 'B' } ) ];

		const grouped = groupCommands( commands );

		expect( grouped.size ).toBe( 1 );
		expect( grouped.get( '' )?.map( item => item.id ) ).toEqual( [ 'a', 'b' ] );
	} );

	it( 'preserves insertion order of groups', () => {
		const commands = [
			cmd( { id: 'a', title: 'A', group: 'Actions' } ),
			cmd( { id: 'b', title: 'B', group: 'Pages' } ),
			cmd( { id: 'c', title: 'C', group: 'Actions' } ),
		];

		const keys = [ ...groupCommands( commands ).keys() ];

		expect( keys ).toEqual( [ 'Actions', 'Pages' ] );
	} );

	it( 'handles a mix of grouped and ungrouped commands', () => {
		const commands = [
			cmd( { id: 'a', title: 'A', group: 'Pages' } ),
			cmd( { id: 'b', title: 'B' } ),
			cmd( { id: 'c', title: 'C', group: 'Pages' } ),
		];

		const grouped = groupCommands( commands );

		expect( grouped.size ).toBe( 2 );
		expect( grouped.get( 'Pages' )?.length ).toBe( 2 );
		expect( grouped.get( '' )?.length ).toBe( 1 );
	} );
} );
