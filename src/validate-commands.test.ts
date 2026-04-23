import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { validateCommands } from './validate-commands';

import type { Command } from './types';

function makeCommand( overrides: Partial< Command > = {} ): Command {
	return {
		id: 'test-cmd',
		title: 'Test Command',
		route: '/test',
		...overrides,
	};
}

describe( 'validateCommands', () => {
	let warnSpy: ReturnType< typeof vi.spyOn >;
	const originalEnv = process.env.NODE_ENV;

	beforeEach( () => {
		process.env.NODE_ENV = 'development';
		warnSpy = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		process.env.NODE_ENV = originalEnv;
		warnSpy.mockRestore();
	} );

	it( 'accepts a valid command with route', () => {
		validateCommands( [ makeCommand() ] );
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it( 'accepts a valid command with action', () => {
		validateCommands( [ makeCommand( { route: undefined, action: () => {} } ) ] );
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it( 'accepts an empty array', () => {
		validateCommands( [] );
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it( 'warns when a command has neither route nor action', () => {
		validateCommands( [ makeCommand( { id: 'no-target', route: undefined } ) ] );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( '"no-target" must have either "route" or "action"' )
		);
	} );

	it( 'warns when a command has both route and action', () => {
		validateCommands( [ makeCommand( { id: 'both', action: () => {} } ) ] );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( '"both" must not have both "route" and "action"' )
		);
	} );

	it( 'warns on duplicate ids', () => {
		validateCommands( [ makeCommand( { id: 'dup' } ), makeCommand( { id: 'dup' } ) ] );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( 'Duplicate command id "dup"' )
		);
	} );

	it( 'warns when id is an empty string', () => {
		validateCommands( [ makeCommand( { id: '' } ) ] );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( 'empty or missing "id"' ),
			expect.anything()
		);
	} );

	it( 'warns when title is an empty string', () => {
		validateCommands( [ makeCommand( { id: 'no-title', title: '' } ) ] );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( '"no-title" has an empty or missing "title"' )
		);
	} );

	it( 'reports multiple issues on the same command', () => {
		validateCommands( [ makeCommand( { id: '', title: '', route: undefined } ) ] );
		// empty id, empty title, missing route+action
		expect( warnSpy ).toHaveBeenCalledTimes( 3 );
	} );

	it( 'does not warn in production mode', () => {
		process.env.NODE_ENV = 'production';
		validateCommands( [ makeCommand( { id: '', title: '', route: undefined } ) ] );
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it( 'validates all commands, not just the first', () => {
		validateCommands( [
			makeCommand( { id: 'valid-1' } ),
			makeCommand( { id: 'bad', route: undefined } ),
			makeCommand( { id: 'valid-2' } ),
		] );
		expect( warnSpy ).toHaveBeenCalledTimes( 1 );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( '"bad" must have either "route" or "action"' )
		);
	} );
} );
