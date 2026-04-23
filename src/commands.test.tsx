import { act, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Commands } from './commands';

interface KeyModifiers {
	meta?: boolean;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
}

function dispatchKey( key: string, modifiers: KeyModifiers = {} ): void {
	act( () => {
		document.dispatchEvent(
			new KeyboardEvent( 'keydown', {
				key,
				metaKey: modifiers.meta ?? false,
				ctrlKey: modifiers.ctrl ?? false,
				shiftKey: modifiers.shift ?? false,
				altKey: modifiers.alt ?? false,
				bubbles: true,
				cancelable: true,
			} )
		);
	} );
}

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
