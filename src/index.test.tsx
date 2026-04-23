import { describe, it, expect } from 'vitest';

import { validateCommands } from './index';

import type { Command } from './index';

describe( 'public API', () => {
	it( 'exports validateCommands', () => {
		expect( typeof validateCommands ).toBe( 'function' );
	} );

	it( 'Command type is usable', () => {
		const cmd: Command = {
			id: 'test',
			title: 'Test',
			route: '/test',
		};
		expect( cmd.id ).toBe( 'test' );
	} );
} );
