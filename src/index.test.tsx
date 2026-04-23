import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CommandBase, validateCommands } from './index';

describe( 'CommandBase', () => {
	it( 'renders without crashing', () => {
		render(
			<CommandBase>
				<CommandBase.Input placeholder="Search..." />
				<CommandBase.List>
					<CommandBase.Empty>No results</CommandBase.Empty>
				</CommandBase.List>
			</CommandBase>
		);

		expect( screen.getByPlaceholderText( 'Search...' ) ).toBeInTheDocument();
	} );
} );

describe( 'validateCommands', () => {
	it( 'is exported', () => {
		expect( typeof validateCommands ).toBe( 'function' );
	} );
} );
