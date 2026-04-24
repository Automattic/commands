import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

import { Commands } from './commands';
import { cmd, dispatchKey } from './test-utils';

import type { Command } from './types';

/* ---------- helpers ---------- */

/** Open the palette by dispatching the default Meta+k trigger. */
function openPalette() {
	dispatchKey( 'k', { meta: true } );
}

/** Type into the search input once the dialog is visible. */
function typeSearch( value: string ) {
	const input = screen.getByPlaceholderText( 'Search commands...' );
	fireEvent.change( input, { target: { value } } );
}

/* ---------- fixtures ---------- */

const mixedCommands: Command[] = [
	cmd( { id: 'dashboard', title: 'Dashboard', group: 'Pages', description: 'Go to dashboard' } ),
	cmd( {
		id: 'settings',
		title: 'Settings',
		group: 'Pages',
		keywords: [ 'preferences', 'config' ],
	} ),
	cmd( {
		id: 'toggle-theme',
		title: 'Toggle Dark Mode',
		group: 'Actions',
		action: () => {},
		route: undefined,
		shortcut: '⌘D',
	} ),
	cmd( { id: 'ungrouped', title: 'Standalone' } ),
];

/* ---------- tests ---------- */

describe( 'Commands', () => {
	/* --- open / close --- */

	describe( 'open / close', () => {
		it( 'opens the dialog when triggerKey is pressed', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );

			expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();

			openPalette();

			await waitFor( () => {
				expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
			} );
		} );

		it( 'closes the dialog on Escape', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );

			openPalette();
			await waitFor( () => {
				expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
			} );

			fireEvent.keyDown( screen.getByRole( 'dialog' ), { key: 'Escape' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );
		} );
	} );

	/* --- rendering --- */

	describe( 'rendering', () => {
		it( 'renders command titles as items', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Dashboard' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Toggle Dark Mode' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Standalone' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders descriptions when provided', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Go to dashboard' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders shortcut hints when provided', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( '⌘D' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders icons when provided', async () => {
			const withIcon = [
				cmd( {
					id: 'iconic',
					title: 'With Icon',
					icon: <span data-testid="test-icon">★</span>,
				} ),
			];
			render( <Commands commands={ withIcon } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByTestId( 'test-icon' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders package-owned cmdk attribute hooks for theming', async () => {
			const commands = [
				cmd( {
					id: 'themed',
					title: 'Themed command',
					description: 'Uses theme hooks',
					icon: <span data-testid="theme-icon">T</span>,
					shortcut: '⌘T',
				} ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Themed command' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			expect( input.closest( '[cmdk-input-wrapper]' ) ).toBeInTheDocument();

			const item = screen.getByText( 'Themed command' ).closest( '[cmdk-item]' ) as HTMLElement;
			expect( item.querySelector( '[cmdk-item-icon]' ) ).toBeInTheDocument();
			expect( item.querySelector( '[cmdk-item-content]' ) ).toBeInTheDocument();
			expect( item.querySelector( '[cmdk-item-title]' ) ).toHaveTextContent( 'Themed command' );
			expect( item.querySelector( '[cmdk-item-description]' ) ).toHaveTextContent(
				'Uses theme hooks'
			);
			expect( item.querySelector( '[cmdk-item-shortcut]' ) ).toHaveTextContent( '⌘T' );
		} );

		it( 'renders the type label with a cmdk attribute hook', async () => {
			const commands = [ cmd( { id: 'route', title: 'Route command', route: '/route' } ) ];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Route command' ) ).toBeInTheDocument();
			} );

			const item = screen.getByText( 'Route command' ).closest( '[cmdk-item]' ) as HTMLElement;
			expect( item.querySelector( '[cmdk-item-type]' ) ).toHaveTextContent( 'Link' );
		} );

		it( 'shows "Link" label for route commands', async () => {
			const commands = [ cmd( { id: 'a', title: 'Route Cmd', route: '/go' } ) ];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Link' ) ).toBeInTheDocument();
			} );
		} );

		it( 'shows "Action" label for action commands', async () => {
			const commands = [
				cmd( { id: 'a', title: 'Action Cmd', action: () => {}, route: undefined } ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Action' ) ).toBeInTheDocument();
			} );
		} );

		it( 'shows shortcut instead of type label when shortcut is set', async () => {
			const commands = [ cmd( { id: 'a', title: 'With Shortcut', route: '/go', shortcut: '⌘G' } ) ];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( '⌘G' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'Link' ) ).not.toBeInTheDocument();
			} );
		} );
	} );

	/* --- grouping --- */

	describe( 'grouping', () => {
		it( 'renders group headings for grouped commands', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Pages' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Actions' ) ).toBeInTheDocument();
			} );
		} );

		it( 'places commands under their correct group', async () => {
			const commands = [
				cmd( { id: 'a', title: 'Alpha', group: 'First' } ),
				cmd( { id: 'b', title: 'Beta', group: 'Second' } ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				const firstGroup = screen.getByText( 'First' ).closest( '[cmdk-group]' );
				expect( firstGroup ).toBeInTheDocument();

				const secondGroup = screen.getByText( 'Second' ).closest( '[cmdk-group]' );
				expect( secondGroup ).toBeInTheDocument();
			} );

			const firstGroup = screen.getByText( 'First' ).closest( '[cmdk-group]' ) as HTMLElement;
			expect( within( firstGroup ).getByText( 'Alpha' ) ).toBeInTheDocument();

			const secondGroup = screen.getByText( 'Second' ).closest( '[cmdk-group]' ) as HTMLElement;
			expect( within( secondGroup ).getByText( 'Beta' ) ).toBeInTheDocument();
		} );
	} );

	/* --- search / filtering --- */

	describe( 'search', () => {
		it( 'filters items by title', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Dashboard' ) ).toBeInTheDocument();
			} );

			typeSearch( 'Settings' );

			await waitFor( () => {
				expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'Dashboard' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 'matches on keywords', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
			} );

			typeSearch( 'preferences' );

			await waitFor( () => {
				expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'Dashboard' ) ).not.toBeInTheDocument();
			} );
		} );
	} );

	/* --- empty state --- */

	describe( 'empty state', () => {
		it( 'shows default empty text when no items match', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
			} );

			typeSearch( 'zzzzzzz_no_match' );

			await waitFor( () => {
				expect( screen.getByText( 'No results found.' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders custom emptyState content', async () => {
			render(
				<Commands
					commands={ mixedCommands }
					triggerKey="Meta+k"
					emptyState={ <span>Nothing here!</span> }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
			} );

			typeSearch( 'zzzzzzz_no_match' );

			await waitFor( () => {
				expect( screen.getByText( 'Nothing here!' ) ).toBeInTheDocument();
			} );
		} );
	} );

	/* --- placeholder --- */

	describe( 'placeholder', () => {
		it( 'uses default placeholder', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByPlaceholderText( 'Search commands...' ) ).toBeInTheDocument();
			} );
		} );

		it( 'uses custom placeholder', async () => {
			render(
				<Commands commands={ mixedCommands } triggerKey="Meta+k" placeholder="Type a command..." />
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByPlaceholderText( 'Type a command...' ) ).toBeInTheDocument();
			} );
		} );
	} );

	/* --- keyboard navigation --- */

	describe( 'keyboard navigation', () => {
		it( 'moves selection with arrow keys', async () => {
			const commands = [
				cmd( { id: 'a', title: 'Alpha' } ),
				cmd( { id: 'b', title: 'Beta' } ),
				cmd( { id: 'c', title: 'Gamma' } ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Alpha' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );

			// First item should be selected by default.
			const firstItem = screen.getByText( 'Alpha' ).closest( '[cmdk-item]' );
			expect( firstItem ).toHaveAttribute( 'aria-selected', 'true' );

			// Arrow down → second item selected.
			fireEvent.keyDown( input, { key: 'ArrowDown' } );

			await waitFor( () => {
				const secondItem = screen.getByText( 'Beta' ).closest( '[cmdk-item]' );
				expect( secondItem ).toHaveAttribute( 'aria-selected', 'true' );
			} );
		} );

		it( 'selects item on Enter and closes dialog', async () => {
			const commands = [ cmd( { id: 'a', title: 'Alpha', route: '/alpha' } ) ];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Alpha' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );
		} );
	} );

	/* --- trigger key --- */

	describe( 'trigger key', () => {
		it( 'opens when the configured triggerKey is pressed', () => {
			render(
				<Commands commands={ [ cmd( { id: 'test', title: 'Test' } ) ] } triggerKey="Meta+k" />
			);

			expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();

			dispatchKey( 'k', { meta: true } );

			expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
		} );

		it( 'ignores keys that do not match the custom triggerKey', () => {
			render(
				<Commands commands={ [ cmd( { id: 'test', title: 'Test' } ) ] } triggerKey="Ctrl+Shift+p" />
			);

			dispatchKey( 'k', { meta: true } );
			expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();

			dispatchKey( 'p', { ctrl: true, shift: true } );
			expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
		} );
	} );
} );

describe( 'theme CSS contract', () => {
	const themeCss = readFileSync( 'src/theme.css', 'utf8' );

	it( 'includes the required public custom properties', () => {
		const requiredVariables = [
			'--cmdk-bg',
			'--cmdk-text',
			'--cmdk-border',
			'--cmdk-item-selected-bg',
			'--cmdk-item-selected-text',
			'--cmdk-input-bg',
			'--cmdk-input-text',
			'--cmdk-placeholder',
			'--cmdk-group-heading',
			'--cmdk-shadow',
			'--cmdk-radius',
			'--cmdk-max-height',
		];

		for ( const variableName of requiredVariables ) {
			expect( themeCss ).toContain( variableName );
		}
	} );

	it( 'targets cmdk attribute selectors for palette parts', () => {
		const requiredSelectors = [
			'[cmdk-overlay]',
			'[cmdk-dialog]',
			'[cmdk-input-wrapper]',
			'[cmdk-input]',
			'[cmdk-list]',
			'[cmdk-group-heading]',
			'[cmdk-item]',
			'[cmdk-item-icon]',
			'[cmdk-item-content]',
			'[cmdk-item-title]',
			'[cmdk-item-description]',
			'[cmdk-item-shortcut]',
			'[cmdk-item-type]',
			'[cmdk-empty]',
		];

		for ( const selector of requiredSelectors ) {
			expect( themeCss ).toContain( selector );
		}
	} );

	it( 'does not use old package-owned data selectors', () => {
		expect( themeCss ).not.toContain( '[data-cmdk-input-wrapper]' );
		expect( themeCss ).not.toContain( '[data-slot=' );
	} );
} );
