import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Commands } from './commands';
import { cmd, dispatchKey } from './test-utils';

import type { Command } from './types';

/* ---------- helpers ---------- */

/** Open the palette by dispatching the default Meta+k trigger. */
function openPalette() {
	dispatchKey( 'k', { meta: true } );
}

/** Open the palette and wait for the dialog to be visible. */
async function openPaletteAndWait() {
	openPalette();

	await waitFor( () => {
		expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
	} );
}

/** Type into the search input once the dialog is visible. */
function typeSearch( value: string ) {
	const input = screen.getByPlaceholderText( 'Search commands...' );
	fireEvent.change( input, { target: { value } } );
}

/** Select a visible command by title and wait for the dialog to close. */
async function selectCommand( title: string ) {
	fireEvent.click( screen.getByText( title ) );

	await waitFor( () => {
		expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
	} );
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
	beforeEach( () => {
		window.localStorage.clear();
	} );

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

	/* --- recent commands --- */

	describe( 'recent commands', () => {
		it( 'renders recently used commands above other groups when search is empty', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			await openPaletteAndWait();
			await selectCommand( 'Settings' );

			await openPaletteAndWait();

			const recentGroup = screen.getByText( 'Recently Used' ).closest( '[cmdk-group]' );
			expect( recentGroup ).toBeInTheDocument();
			expect( within( recentGroup as HTMLElement ).getByText( 'Settings' ) ).toBeInTheDocument();

			const list = screen.getByRole( 'dialog' ).querySelector( '[cmdk-list]' ) as HTMLElement;
			const pagesGroup = screen.getByText( 'Pages' ).closest( '[cmdk-group]' ) as HTMLElement;
			const groups = Array.from( list.querySelectorAll( '[cmdk-group]' ) );

			expect( groups[ 0 ] ).toBe( recentGroup );
			expect( groups[ 1 ] ).toBe( pagesGroup );
		} );

		it( 'does not render recently used commands when showRecent is false', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" showRecent={ false } /> );
			await openPaletteAndWait();
			await selectCommand( 'Settings' );

			await openPaletteAndWait();

			expect( screen.queryByText( 'Recently Used' ) ).not.toBeInTheDocument();
		} );

		it( 'limits recently used commands with recentLimit', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" recentLimit={ 2 } /> );

			await openPaletteAndWait();
			await selectCommand( 'Dashboard' );

			await openPaletteAndWait();
			await selectCommand( 'Settings' );

			await openPaletteAndWait();
			await selectCommand( 'Toggle Dark Mode' );

			await openPaletteAndWait();

			const recentGroup = screen.getByText( 'Recently Used' ).closest( '[cmdk-group]' );
			expect( recentGroup ).toBeInTheDocument();
			expect(
				within( recentGroup as HTMLElement ).getByText( 'Toggle Dark Mode' )
			).toBeInTheDocument();
			expect( within( recentGroup as HTMLElement ).getByText( 'Settings' ) ).toBeInTheDocument();
			expect(
				within( recentGroup as HTMLElement ).queryByText( 'Dashboard' )
			).not.toBeInTheDocument();
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

		it( 'matches titles when the command id differs from the display text', async () => {
			const commands = [
				cmd( {
					id: 'logout',
					title: 'Log out',
					action: () => {},
					route: undefined,
				} ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			await openPaletteAndWait();

			await waitFor( () => {
				expect( screen.getByText( 'Log out' ) ).toBeInTheDocument();
			} );

			typeSearch( 'Log out' );

			await waitFor( () => {
				expect( screen.getByText( 'Log out' ) ).toBeInTheDocument();
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

	/* --- route resolution --- */

	describe( 'route resolution', () => {
		it( 'navigates to a resolved route when all params are resolved', async () => {
			const onNavigate = vi.fn();
			const resolver = () => ( { appId: '42' } );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/logs' );
			} );
		} );

		it( 'navigates to param-free routes without a resolver', async () => {
			const onNavigate = vi.fn();
			const commands = [ cmd( { id: 'home', title: 'Home', route: '/home' } ) ];

			render( <Commands commands={ commands } triggerKey="Meta+k" onNavigate={ onNavigate } /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Home' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/home' );
			} );
		} );

		it( 'works with an async resolver', async () => {
			const onNavigate = vi.fn();
			const resolver = () => Promise.resolve( { id: '7' } );
			const commands = [ cmd( { id: 'detail', title: 'Detail', route: '/items/:id' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Detail' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/items/7' );
			} );
		} );
	} );

	/* --- param selection sub-layer --- */

	describe( 'param selection sub-layer', () => {
		it( 'shows options when resolver returns an array for a param', async () => {
			const onNavigate = vi.fn();
			const resolver = () => ( {
				appId: '42',
				env: [ 'production', 'staging' ],
			} );
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Audit' ) ).toBeInTheDocument();
			} );

			// Select the command
			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Sub-layer appears with options
			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
				expect( screen.getByText( 'staging' ) ).toBeInTheDocument();
			} );
			expect( onNavigate ).not.toHaveBeenCalled();
		} );

		it( 'navigates after selecting an option', async () => {
			const onNavigate = vi.fn();
			const resolver = () => ( {
				appId: '42',
				env: [ 'production', 'staging' ],
			} );
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Audit' ) ).toBeInTheDocument();
			} );

			// Select the command
			let input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Wait for sub-layer
			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			// Select the option
			input = screen.getByPlaceholderText( 'Select env...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/production/audit' );
			} );
		} );

		it( 'steps through multiple unresolved params sequentially', async () => {
			const onNavigate = vi.fn();
			const resolver = () => ( {
				appId: [ 'app-one', 'app-two' ],
				env: [ 'prod', 'dev' ],
			} );
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Audit' ) ).toBeInTheDocument();
			} );

			// Select the command
			let input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// First param: appId options
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
				expect( screen.getByText( 'app-two' ) ).toBeInTheDocument();
			} );

			// Select first option (app-one is selected by default)
			input = screen.getByPlaceholderText( 'Select appId...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Second param: env options
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
				expect( screen.getByText( 'dev' ) ).toBeInTheDocument();
			} );

			// Select first option (prod is selected by default)
			input = screen.getByPlaceholderText( 'Select env...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/app-one/prod/audit' );
			} );
		} );

		it( 'shows the sub-layer when params are unresolved without options', async () => {
			const onNavigate = vi.fn();
			const resolver = () => ( {} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Palette stays open with the sub-layer (no options to show)
			await waitFor( () => {
				expect( screen.getByRole( 'dialog' ) ).toBeInTheDocument();
			} );
			expect( onNavigate ).not.toHaveBeenCalled();
		} );
	} );

	/* --- loading state --- */

	describe( 'loading state', () => {
		it( 'shows a loading indicator while the resolver is running', async () => {
			let finish: ( value: Record< string, string > ) => void = () => {};
			const resolver = () =>
				new Promise< Record< string, string > >( resolve => {
					finish = resolve;
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render( <Commands commands={ commands } triggerKey="Meta+k" resolver={ resolver } /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Loading indicator visible while resolver is pending
			await waitFor( () => {
				expect( screen.getByText( 'Resolving…' ) ).toBeInTheDocument();
			} );

			// Resolve the promise
			finish( { appId: '42' } );

			// Loading indicator disappears
			await waitFor( () => {
				expect( screen.queryByText( 'Resolving…' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 'clears loading state when dialog is closed during resolution', async () => {
			const resolver = () =>
				new Promise< Record< string, string > >( () => {
					/* never resolves */
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render( <Commands commands={ commands } triggerKey="Meta+k" resolver={ resolver } /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'Resolving…' ) ).toBeInTheDocument();
			} );

			// Close the dialog
			fireEvent.keyDown( screen.getByRole( 'dialog' ), { key: 'Escape' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );

			// Reopen — should not show loading
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'Resolving…' ) ).not.toBeInTheDocument();
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
