import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Commands } from './commands';
import { dispatchKey } from './test-utils';

describe( 'Commands', () => {
	it( 'renders without crashing', () => {
		render( <Commands commands={ [ { id: 'test', title: 'Test', route: '/test' } ] } /> );

		expect( screen.getByText( 'Work in progress...' ) ).toBeInTheDocument();
	} );

	it( 'opens when the configured triggerKey is pressed', () => {
		render(
			<Commands
				commands={ [ { id: 'test', title: 'Test', route: '/test' } ] }
				triggerKey="Meta+k"
			/>
		);

		expect( screen.getByText( 'Work in progress...' ) ).toHaveAttribute( 'data-open', 'false' );

		dispatchKey( 'k', { meta: true } );

		expect( screen.getByText( 'Work in progress...' ) ).toHaveAttribute( 'data-open', 'true' );
	} );

	it( 'ignores keys that do not match the custom triggerKey', () => {
		render(
			<Commands
				commands={ [ { id: 'test', title: 'Test', route: '/test' } ] }
				triggerKey="Ctrl+Shift+p"
			/>
		);

		dispatchKey( 'k', { meta: true } );
		expect( screen.getByText( 'Work in progress...' ) ).toHaveAttribute( 'data-open', 'false' );

		dispatchKey( 'p', { ctrl: true, shift: true } );
		expect( screen.getByText( 'Work in progress...' ) ).toHaveAttribute( 'data-open', 'true' );
	} );
} );
