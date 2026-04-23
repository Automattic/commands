import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Command, validateCommands } from './index';

describe( 'Command', () => {
	it( 'renders without crashing', () => {
		render(
			<Command>
				<Command.Input placeholder="Search..." />
				<Command.List>
					<Command.Empty>No results</Command.Empty>
				</Command.List>
			</Command>
		);

		expect( screen.getByPlaceholderText( 'Search...' ) ).toBeInTheDocument();
	} );
} );

describe( 'validateCommands', () => {
	it( 'is exported', () => {
		expect( typeof validateCommands ).toBe( 'function' );
	} );
} );
