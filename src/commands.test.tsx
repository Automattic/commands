import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
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

		it( 'resets param selection when closed via trigger key', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'production', 'staging' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			// Select the command to enter param selection
			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			// Close via trigger key (not Escape or onOpenChange)
			dispatchKey( 'k', { meta: true } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );

			// Reopen — should show normal command list, not stale param selection
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Audit' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'production' ) ).not.toBeInTheDocument();
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

		it( 'restores previous focus when closed', async () => {
			render(
				<>
					<button>Before palette</button>
					<Commands commands={ mixedCommands } triggerKey="Meta+k" />
				</>
			);

			const previousFocus = screen.getByRole( 'button', { name: 'Before palette' } );
			previousFocus.focus();

			openPalette();

			const dialog = await screen.findByRole( 'dialog' );
			await waitFor( () => {
				expect( dialog ).toContainElement( document.activeElement as HTMLElement );
			} );

			fireEvent.keyDown( dialog, { key: 'Escape' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );
			await waitFor( () => {
				expect( previousFocus ).toHaveFocus();
			} );
		} );
	} );

	/* --- events --- */

	describe( 'events', () => {
		it( 'emits an open event when the palette opens', async () => {
			const onEvent = vi.fn();

			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" onEvent={ onEvent } /> );
			await openPaletteAndWait();

			expect( onEvent ).toHaveBeenCalledTimes( 1 );
			expect( onEvent ).toHaveBeenCalledWith( { type: 'open' } );
		} );

		it( 'emits an execute event for action commands', async () => {
			const action = vi.fn();
			const onEvent = vi.fn();
			const command = cmd( {
				id: 'toggle-theme',
				title: 'Toggle Theme',
				action,
				route: undefined,
			} );

			render( <Commands commands={ [ command ] } triggerKey="Meta+k" onEvent={ onEvent } /> );
			await openPaletteAndWait();
			onEvent.mockClear();

			fireEvent.click( screen.getByText( 'Toggle Theme' ) );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );
			expect( action ).toHaveBeenCalledTimes( 1 );
			expect( onEvent ).toHaveBeenCalledWith( {
				type: 'execute',
				command,
				commandType: 'action',
			} );
		} );

		it( 'emits an execute event for resolved route commands', async () => {
			const onEvent = vi.fn();
			const onNavigate = vi.fn();
			const resolver = () => '42';
			const command = cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } );

			render(
				<Commands
					commands={ [ command ] }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
					onEvent={ onEvent }
				/>
			);
			await openPaletteAndWait();
			onEvent.mockClear();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/logs' );
			} );
			expect( onEvent ).toHaveBeenCalledWith( {
				type: 'execute',
				command,
				commandType: 'route',
				path: '/apps/42/logs',
			} );
		} );

		it( 'emits an execute event with selected route params', async () => {
			const onEvent = vi.fn();
			const onNavigate = vi.fn();
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'production', 'staging' ];
			};
			const command = cmd( {
				id: 'audit',
				title: 'Audit',
				route: '/apps/:appId/:env/audit',
			} );

			render(
				<Commands
					commands={ [ command ] }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
					onEvent={ onEvent }
				/>
			);
			await openPaletteAndWait();
			onEvent.mockClear();

			let input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			input = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/production/audit' );
			} );
			expect( onEvent ).toHaveBeenCalledWith( {
				type: 'execute',
				command,
				commandType: 'route',
				path: '/apps/42/production/audit',
			} );
		} );

		it( 'emits a resolve error event when route resolution fails', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			const onEvent = vi.fn();
			const error = new Error( 'boom' );
			const resolver = (): Promise< string > => Promise.reject( error );
			const command = cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } );

			render(
				<Commands
					commands={ [ command ] }
					triggerKey="Meta+k"
					resolver={ resolver }
					onEvent={ onEvent }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();
			onEvent.mockClear();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'boom' );
			} );
			expect( onEvent ).toHaveBeenCalledWith( {
				type: 'resolve_error',
				command,
				error,
			} );
			errorSpy.mockRestore();
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

		it( 'renders a custom search icon when searchIcon is provided', async () => {
			render(
				<Commands
					commands={ mixedCommands }
					triggerKey="Meta+k"
					searchIcon={ <span data-testid="custom-search-icon">🔍</span> }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByTestId( 'custom-search-icon' ) ).toBeInTheDocument();
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
			expect( item.querySelector( '[cmdk-item-icon]' ) ).toHaveAttribute( 'aria-hidden', 'true' );
			expect( item.querySelector( '[cmdk-item-content]' ) ).toBeInTheDocument();
			expect( item.querySelector( '[cmdk-item-title]' ) ).toHaveTextContent( 'Themed command' );
			expect( item.querySelector( '[cmdk-item-description]' ) ).toHaveTextContent(
				'Uses theme hooks'
			);
			expect( item.querySelector( '[cmdk-item-shortcut]' ) ).toHaveTextContent( '⌘T' );
		} );

		it( 'renders accessible dialog, input, list, groups, and options', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			await openPaletteAndWait();

			const dialog = screen.getByRole( 'dialog', { name: 'Command palette' } );
			const input = within( dialog ).getByRole( 'combobox', { name: 'Search commands' } );
			const list = within( dialog ).getByRole( 'listbox', { name: 'Suggestions' } );

			expect( input ).toHaveAttribute( 'aria-label', 'Search commands' );
			expect( input ).toHaveAttribute( 'aria-autocomplete', 'list' );
			expect( input ).toHaveAttribute( 'aria-expanded', 'true' );
			expect( input ).toHaveAttribute( 'aria-controls', list.id );
			expect( list ).not.toHaveAttribute( 'aria-busy' );
			const options = within( list ).getAllByRole( 'option' );
			expect( options ).toHaveLength( 4 );
			expect( options[ 0 ] ).toHaveAttribute( 'aria-selected', 'true' );
			expect( within( list ).getByRole( 'group', { name: 'Pages' } ) ).toBeInTheDocument();
			expect( within( list ).getByRole( 'group', { name: 'Actions' } ) ).toBeInTheDocument();
		} );

		it( 'announces filtered command result counts to assistive technology', async () => {
			const commands = [
				cmd( { id: 'a', title: 'Alpha' } ),
				cmd( { id: 'b', title: 'Beta' } ),
				cmd( { id: 'c', title: 'Gamma' } ),
			];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			await openPaletteAndWait();

			const status = screen.getByRole( 'status' );
			expect( status ).toHaveAttribute( 'aria-live', 'polite' );
			expect( status ).toHaveAttribute( 'aria-atomic', 'true' );
			expect( status ).toHaveTextContent( '3 commands found.' );

			typeSearch( 'Alpha' );
			await waitFor( () => {
				expect( status ).toHaveTextContent( '1 command found.' );
			} );

			typeSearch( 'Nothing matches this' );
			await waitFor( () => {
				expect( status ).toHaveTextContent( 'No commands found.' );
			} );
		} );

		it( 'shows shortcut on the right side when shortcut is set', async () => {
			const commands = [ cmd( { id: 'a', title: 'With Shortcut', route: '/go', shortcut: '⌘G' } ) ];
			render( <Commands commands={ commands } triggerKey="Meta+k" /> );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( '⌘G' ) ).toBeInTheDocument();
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

		it( 'hides recently used commands while searching', async () => {
			render( <Commands commands={ mixedCommands } triggerKey="Meta+k" /> );
			await openPaletteAndWait();
			await selectCommand( 'Settings' );

			await openPaletteAndWait();
			expect( screen.getByText( 'Recently Used' ) ).toBeInTheDocument();

			typeSearch( 'Settings' );

			await waitFor( () => {
				expect( screen.queryByText( 'Recently Used' ) ).not.toBeInTheDocument();
			} );
			expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
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

	/* --- localeText --- */

	describe( 'localeText', () => {
		it( 'uses custom localeText for dialog, input, empty state, and recent heading', async () => {
			render(
				<Commands
					commands={ mixedCommands }
					triggerKey="Meta+k"
					localeText={ {
						searchInputLabel: 'Find commands',
						searchPlaceholder: 'Find something...',
						dialogTitle: 'Command finder',
						dialogDescription: 'Find and run things',
						commandListLabel: 'Command suggestions',
						noResults: 'Nothing matched.',
						recentlyUsed: 'Recent commands',
					} }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByRole( 'dialog', { name: 'Command finder' } ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Find something...' );
			expect( input ).toHaveAttribute( 'aria-label', 'Find commands' );
			expect(
				within( screen.getByRole( 'dialog' ) ).getByRole( 'listbox', {
					name: 'Command suggestions',
				} )
			).toBeInTheDocument();

			fireEvent.change( input, { target: { value: 'zzzzzzz_no_match' } } );

			await waitFor( () => {
				expect( screen.getByText( 'Nothing matched.' ) ).toBeInTheDocument();
			} );

			fireEvent.change( input, { target: { value: '' } } );
			await waitFor( () => {
				expect( screen.getByText( 'Settings' ) ).toBeInTheDocument();
			} );
			await selectCommand( 'Settings' );
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Recent commands' ) ).toBeInTheDocument();
			} );
		} );

		it( 'keeps placeholder and emptyState props ahead of localeText', async () => {
			render(
				<Commands
					commands={ mixedCommands }
					triggerKey="Meta+k"
					placeholder="Prop placeholder..."
					emptyState={ <span>Prop empty state</span> }
					localeText={ {
						searchPlaceholder: 'Message placeholder...',
						noResults: 'Message empty state',
					} }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByPlaceholderText( 'Prop placeholder...' ) ).toBeInTheDocument();
			} );

			fireEvent.change( screen.getByPlaceholderText( 'Prop placeholder...' ), {
				target: { value: 'zzzzzzz_no_match' },
			} );

			await waitFor( () => {
				expect( screen.getByText( 'Prop empty state' ) ).toBeInTheDocument();
			} );
			expect( screen.queryByText( 'Message empty state' ) ).not.toBeInTheDocument();
		} );

		it( 'uses custom parameter-selection localeText and result count localeText', async () => {
			const resolver = () => [ 'production', 'staging' ];
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					localeText={ {
						selectionContext: 'Selection trail',
						selectParamLabel: name => `Pick ${ name }`,
						selectParamPlaceholder: name => `Pick ${ name } now`,
						chooseParam: name => `Pick a ${ name }`,
						noMatchingOptions: 'No option matches.',
						resultCount: ( count, itemType ) => `${ itemType }:${ count }`,
						noResultsCount: itemType => `empty:${ itemType }`,
					} }
				/>
			);
			await openPaletteAndWait();

			fireEvent.keyDown( screen.getByPlaceholderText( 'Search commands...' ), { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			const paramInput = screen.getByPlaceholderText( 'Pick env now' );
			expect( paramInput ).toHaveAttribute( 'aria-label', 'Pick env' );
			expect( screen.getByLabelText( 'Selection trail' ) ).toBeInTheDocument();
			expect( screen.getByRole( 'group', { name: 'Pick a env' } ) ).toBeInTheDocument();
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( 'option:2' );

			fireEvent.change( paramInput, { target: { value: 'zzzzzzz_no_match' } } );

			await waitFor( () => {
				expect( screen.getByText( 'No option matches.' ) ).toBeInTheDocument();
				expect( screen.getByRole( 'status' ) ).toHaveTextContent( 'empty:option' );
			} );
		} );

		it( 'uses custom loading and fallback resolver error localeText', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			let rejectRequest: ( reason?: unknown ) => void = () => {};
			const resolver = () =>
				new Promise< string >( ( _resolve, reject ) => {
					rejectRequest = reject;
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
					localeText={ {
						loading: 'Loading commands...',
						routeResolutionFailed: 'Could not resolve route.',
					} }
				/>
			);
			await openPaletteAndWait();

			fireEvent.keyDown( screen.getByPlaceholderText( 'Search commands...' ), { key: 'Enter' } );

			await waitFor( () => {
				expect(
					screen.getByRole( 'progressbar', { name: 'Loading commands...' } )
				).toBeInTheDocument();
			} );

			rejectRequest( 'bad response' );

			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'Could not resolve route.' );
			} );
			errorSpy.mockRestore();
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

			// Arrow up returns to the first item, then wraps to the last item.
			fireEvent.keyDown( input, { key: 'ArrowUp' } );
			await waitFor( () => {
				expect( firstItem ).toHaveAttribute( 'aria-selected', 'true' );
			} );

			fireEvent.keyDown( input, { key: 'ArrowUp' } );
			await waitFor( () => {
				const lastItem = screen.getByText( 'Gamma' ).closest( '[cmdk-item]' );
				expect( lastItem ).toHaveAttribute( 'aria-selected', 'true' );
			} );

			// Arrow down wraps from the last item back to the first item.
			fireEvent.keyDown( input, { key: 'ArrowDown' } );
			await waitFor( () => {
				expect( firstItem ).toHaveAttribute( 'aria-selected', 'true' );
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
			const resolver = () => '42';
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
			const resolver = () => Promise.resolve( '7' );
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
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'production', 'staging' ];
			};
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

		it( 'labels param selection input and announces option counts', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}

				return [ 'production', 'staging' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render( <Commands commands={ commands } triggerKey="Meta+k" resolver={ resolver } /> );
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			const paramInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			expect( paramInput ).toHaveAttribute( 'aria-label', 'Select env' );
			expect( screen.getByRole( 'combobox', { name: 'Select env' } ) ).toBe( paramInput );
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '2 options found.' );
			expect( screen.getByRole( 'group', { name: 'Choose env' } ) ).toBeInTheDocument();
		} );

		it( 'navigates after selecting an option', async () => {
			const onNavigate = vi.fn();
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'production', 'staging' ];
			};
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
			input = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/production/audit' );
			} );
		} );

		it( 'steps through multiple unresolved params sequentially', async () => {
			const onNavigate = vi.fn();
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one', 'app-two' ];
				}
				return [ 'prod', 'dev' ];
			};
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
			input = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Second param: env options
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
				expect( screen.getByText( 'dev' ) ).toBeInTheDocument();
			} );

			// Select first option (prod is selected by default)
			input = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/app-one/prod/audit' );
			} );
		} );

		it( 'exits param selection on Backspace even after prior command search', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'production', 'staging' ];
			};
			const commands = [
				cmd( { id: 'audit', title: 'Audit Log', route: '/apps/:appId/:env/audit' } ),
				cmd( { id: 'dashboard', title: 'Dashboard', route: '/dashboard' } ),
			];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			// Search for the command first (populates the input)
			typeSearch( 'Audit' );

			await waitFor( () => {
				expect( screen.getByText( 'Audit Log' ) ).toBeInTheDocument();
			} );

			// Select the command — enters param selection
			fireEvent.click( screen.getByText( 'Audit Log' ) );

			await waitFor( () => {
				expect( screen.getByText( 'production' ) ).toBeInTheDocument();
			} );

			// Backspace on the visually empty param input should exit
			const paramInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( paramInput, { key: 'Backspace' } );

			// Should be back to the command list
			await waitFor( () => {
				expect( screen.queryByText( 'production' ) ).not.toBeInTheDocument();
				expect( screen.getByText( 'Audit Log' ) ).toBeInTheDocument();
			} );
		} );

		it( 're-resolves remaining params with selections after each pick', async () => {
			const onNavigate = vi.fn();
			const resolver = vi
				.fn()
				.mockImplementation( ( param: string, selections: Record< string, string > ) => {
					if ( param === 'appId' ) {
						return [ 'app-one', 'app-two' ];
					}
					if ( selections.appId === 'app-one' ) {
						return [ 'prod', 'staging' ];
					}
					return [ 'dev', 'canary' ];
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
			await openPaletteAndWait();

			// Select the command
			let input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// First param: appId options
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );

			// First call: resolver received 'appId' with empty selections and empty search
			expect( resolver ).toHaveBeenCalledWith( 'appId', {}, '' );

			// Select app-one
			input = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Second param: env options (dependent on appId selection)
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
				expect( screen.getByText( 'staging' ) ).toBeInTheDocument();
			} );

			// Second call: resolver received 'env' with appId selection and empty search
			expect( resolver ).toHaveBeenCalledWith( 'env', { appId: 'app-one' }, '' );

			// Select prod
			input = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/app-one/prod/audit' );
			} );
		} );

		it( 'shows labels for labeled-value options and navigates with the value', async () => {
			const onNavigate = vi.fn();
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [
						{ label: 'My App', value: '42' },
						{ label: 'Other App', value: '99' },
					];
				}
				return 'prod';
			};
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/:env/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Labels should be visible, not raw values
			await waitFor( () => {
				expect( screen.getByText( 'My App' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Other App' ) ).toBeInTheDocument();
			} );
			expect( screen.queryByText( '42' ) ).not.toBeInTheDocument();
			expect( screen.queryByText( '99' ) ).not.toBeInTheDocument();

			// Select first option — value (not label) goes into the route
			const paramInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( paramInput, { key: 'Enter' } );

			await waitFor( () => {
				expect( onNavigate ).toHaveBeenCalledWith( '/apps/42/prod/logs' );
			} );
		} );

		it( 'supports mixed plain and labeled options', async () => {
			const onNavigate = vi.fn();
			const resolver = () => [ 'plain-val', { label: 'Labeled', value: 'lbl-val' } ];
			const commands = [ cmd( { id: 'item', title: 'Item', route: '/items/:id' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'plain-val' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Labeled' ) ).toBeInTheDocument();
			} );
		} );

		it( 'renders icon and description on labeled options', async () => {
			const resolver = () => [
				{
					label: 'My App',
					value: '42',
					description: 'apps.example.com/my-app',
					icon: <span data-testid="opt-icon">★</span>,
				},
			];
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'My App' ) ).toBeInTheDocument();
			} );

			const item = screen.getByText( 'My App' ).closest( '[cmdk-item]' ) as HTMLElement;
			expect( item.querySelector( '[cmdk-item-icon]' ) ).toHaveAttribute( 'aria-hidden', 'true' );
			expect( within( item ).getByTestId( 'opt-icon' ) ).toBeInTheDocument();
			expect( item.querySelector( '[cmdk-item-description]' ) ).toHaveTextContent(
				'apps.example.com/my-app'
			);
		} );

		it( 'matches labeled option keywords during param search', async () => {
			const resolver = () => [
				{ label: 'Production', value: 'prod', keywords: [ 'live' ] },
				{ label: 'Staging', value: 'stg' },
			];
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/42/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'Production' ) ).toBeInTheDocument();
			} );

			const paramInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.change( paramInput, { target: { value: 'live' } } );

			await waitFor( () => {
				expect( screen.getByText( 'Production' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'Staging' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 're-calls the resolver with search text during param selection', async () => {
			const resolver = vi.fn().mockImplementation( ( _p: string, _s: unknown, search: string ) => {
				if ( search === '' ) {
					return [
						{ label: 'Alpha App', value: '1' },
						{ label: 'Beta App', value: '2' },
					];
				}
				return [ { label: 'Beta App', value: '2' } ];
			} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Initial options appear
			await waitFor( () => {
				expect( screen.getByText( 'Alpha App' ) ).toBeInTheDocument();
				expect( screen.getByText( 'Beta App' ) ).toBeInTheDocument();
			} );

			// Type into the param input to trigger search
			const paramInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.change( paramInput, { target: { value: 'Beta' } } );

			// Wait for the 300ms debounce + resolver call
			await waitFor( () => {
				expect( resolver ).toHaveBeenCalledWith( 'appId', {}, 'Beta' );
			} );
		} );

		it( 're-calls the resolver with empty search when the user clears the input', async () => {
			const resolver = vi.fn().mockImplementation( ( _p: string, _s: unknown, search: string ) => {
				if ( search === 'Beta' ) {
					return [ { label: 'Beta App', value: '2' } ];
				}
				return [
					{ label: 'Alpha App', value: '1' },
					{ label: 'Beta App', value: '2' },
				];
			} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'Alpha App' ) ).toBeInTheDocument();
			} );

			// Type to filter
			const paramInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.change( paramInput, { target: { value: 'Beta' } } );

			await waitFor( () => {
				expect( resolver ).toHaveBeenCalledWith( 'appId', {}, 'Beta' );
			} );

			// Clear the input — should re-call resolver with empty search
			fireEvent.change( paramInput, { target: { value: '' } } );

			await waitFor( () => {
				expect( resolver ).toHaveBeenCalledWith( 'appId', {}, '' );
			} );
		} );

		it( 'shows the command title in a breadcrumb at the top during param selection', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one', 'app-two' ];
				}
				return [ 'prod', 'dev' ];
			};
			const commands = [
				cmd( { id: 'audit', title: 'Audit log', route: '/apps/:appId/:env/audit' } ),
			];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			// No breadcrumb on the initial command list
			expect( screen.queryByLabelText( 'Selection context' ) ).not.toBeInTheDocument();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// First param: command title alone
			await waitFor( () => {
				expect( screen.getByLabelText( 'Selection context' ) ).toBeInTheDocument();
			} );
			let trail = screen.getByLabelText( 'Selection context' );
			expect( within( trail ).getByText( 'Audit log' ) ).toBeInTheDocument();

			// Pick app-one — breadcrumb should grow
			fireEvent.click( screen.getByText( 'app-one' ) );

			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
			} );

			trail = screen.getByLabelText( 'Selection context' );
			expect( within( trail ).getByText( 'Audit log' ) ).toBeInTheDocument();
			expect( within( trail ).getByText( 'app-one' ) ).toBeInTheDocument();
		} );

		it( 'uses the labeled-value label in the breadcrumb', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ { label: 'My App', value: '42' } ];
				}
				return [ 'prod' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			fireEvent.keyDown( screen.getByPlaceholderText( 'Search commands...' ), { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'My App' ) ).toBeInTheDocument();
			} );

			fireEvent.click( screen.getByText( 'My App' ) );

			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
			} );

			const trail = screen.getByLabelText( 'Selection context' );
			expect( within( trail ).getByText( 'My App' ) ).toBeInTheDocument();
			expect( within( trail ).queryByText( '42' ) ).not.toBeInTheDocument();
		} );

		it( 'hides the breadcrumb when leaving param selection', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return '42';
				}
				return [ 'prod' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			fireEvent.keyDown( screen.getByPlaceholderText( 'Search commands...' ), { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByLabelText( 'Selection context' ) ).toBeInTheDocument();
			} );

			const paramInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( paramInput, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.queryByLabelText( 'Selection context' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 'goes back one step on Backspace instead of resetting to root', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one', 'app-two' ];
				}
				return [ 'prod', 'dev' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// First param: appId options
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );

			// Select app-one to advance to env
			const appIdInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( appIdInput, { key: 'Enter' } );

			// Second param: env options
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
			} );

			// Backspace on empty env input should go back to appId, not root
			const envInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( envInput, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
				expect( screen.getByText( 'app-two' ) ).toBeInTheDocument();
			} );
			expect( screen.queryByText( 'prod' ) ).not.toBeInTheDocument();

			// Breadcrumb should show only the command title (back to first param)
			const trail = screen.getByLabelText( 'Selection context' );
			expect( within( trail ).getByText( 'Audit' ) ).toBeInTheDocument();
			expect( within( trail ).queryByText( 'app-one' ) ).not.toBeInTheDocument();
		} );

		it( 'goes back to root on Backspace from the first param', async () => {
			const resolver = () => [ 'app-one', 'app-two' ];
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );

			// Backspace on the first param should go to root command list
			const paramInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( paramInput, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'app-one' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 'can navigate back multiple steps to root', async () => {
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one' ];
				}
				return [ 'prod' ];
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Select appId
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );
			const appIdInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( appIdInput, { key: 'Enter' } );

			// On env param
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
			} );

			// Back to appId
			const envInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.keyDown( envInput, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );

			// Back to root
			const appIdInput2 = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( appIdInput2, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.getByText( 'Audit' ) ).toBeInTheDocument();
				expect( screen.queryByText( 'app-one' ) ).not.toBeInTheDocument();
				expect( screen.queryByLabelText( 'Selection context' ) ).not.toBeInTheDocument();
			} );
		} );

		it( 'shows the sub-layer when params are unresolved without options', async () => {
			const onNavigate = vi.fn();
			const resolver = () => [];
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
		it( 'shows a spinner while the resolver is running and keeps existing items visible', async () => {
			let finish: ( value: string ) => void = () => {};
			const resolver = () =>
				new Promise< string >( resolve => {
					finish = resolve;
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Spinner visible while resolver is pending
			await waitFor( () => {
				expect( screen.getByRole( 'progressbar', { name: 'Loading...' } ) ).toBeInTheDocument();
			} );
			expect( screen.getByRole( 'listbox', { name: 'Suggestions' } ) ).toHaveAttribute(
				'aria-busy',
				'true'
			);
			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '' );

			// Existing items remain visible during loading
			expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();

			// Resolve the promise
			finish( '42' );

			// Spinner disappears
			await waitFor( () => {
				expect(
					screen.queryByRole( 'progressbar', { name: 'Loading...' } )
				).not.toBeInTheDocument();
			} );
		} );

		it( 'immediately transitions to next param menu and shows loading while resolving', async () => {
			let finishEnvResolve: ( value: string[] ) => void = () => {};
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one', 'app-two' ];
				}
				return new Promise< string[] >( resolve => {
					finishEnvResolve = resolve;
				} );
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// First param: appId options appear
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );

			// Select app-one — should immediately move to env menu
			const appIdInput = screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' );
			fireEvent.keyDown( appIdInput, { key: 'Enter' } );

			// Should immediately be on the env menu with loading, not stuck on appId
			await waitFor( () => {
				const loadingEl = screen.getByText( 'Loading...' );
				expect( loadingEl ).toBeInTheDocument();
				expect( loadingEl.closest( '[cmdk-loading]' ) ).toBeInTheDocument();
			} );

			// Breadcrumb shows the selected appId; option list does not
			const trail = screen.getByLabelText( 'Selection context' );
			expect( within( trail ).getByText( 'app-one' ) ).toBeInTheDocument();
			const list = screen.getByRole( 'listbox', { name: 'Suggestions' } );
			expect( within( list ).queryByText( 'app-one' ) ).not.toBeInTheDocument();

			// Finish the async resolve
			finishEnvResolve( [ 'prod', 'staging' ] );

			// Options replace the loading state
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
				expect( screen.getByText( 'staging' ) ).toBeInTheDocument();
			} );
		} );

		it( 'shows existing options while re-resolving in background', async () => {
			let callCount = 0;
			let finishSecondResolve: ( value: string[] ) => void = () => {};
			const resolver = ( param: string ) => {
				if ( param === 'appId' ) {
					return [ 'app-one' ];
				}
				callCount++;
				if ( callCount === 1 ) {
					return [ 'prod', 'staging' ];
				}
				return new Promise< string[] >( resolve => {
					finishSecondResolve = resolve;
				} );
			};
			const commands = [ cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Select appId
			await waitFor( () => {
				expect( screen.getByText( 'app-one' ) ).toBeInTheDocument();
			} );
			fireEvent.keyDown( screen.getByPlaceholderText( 'Select appId. Backspace to cancel.' ), {
				key: 'Enter',
			} );

			// Env options appear after first resolve
			await waitFor( () => {
				expect( screen.getByText( 'prod' ) ).toBeInTheDocument();
			} );

			// Type to trigger search-based re-resolve (debounced)
			const envInput = screen.getByPlaceholderText( 'Select env. Backspace to cancel.' );
			fireEvent.change( envInput, { target: { value: 'pr' } } );

			// Options remain visible during the search re-resolve
			await waitFor( () => {
				expect( screen.getByRole( 'progressbar', { name: 'Loading...' } ) ).toBeInTheDocument();
			} );
			expect( screen.getByText( 'prod' ) ).toBeInTheDocument();

			finishSecondResolve( [ 'prod' ] );

			await waitFor( () => {
				expect(
					screen.queryByRole( 'progressbar', { name: 'Loading...' } )
				).not.toBeInTheDocument();
			} );
		} );

		it( 'displays the error message when the resolver rejects', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			const onNavigate = vi.fn();
			const resolver = (): Promise< string > => Promise.reject( new Error( 'boom' ) );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
					showRecent={ false }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Error message is displayed in the palette
			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'boom' );
			} );

			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '' );
			expect( screen.queryByRole( 'progressbar', { name: 'Loading...' } ) ).not.toBeInTheDocument();
			expect( onNavigate ).not.toHaveBeenCalled();
			expect( errorSpy ).toHaveBeenCalledWith(
				'[@automattic/commands] Route resolution failed:',
				expect.any( Error )
			);
			errorSpy.mockRestore();
		} );

		it( 'clears the error on Backspace and returns to the command list', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			const resolver = (): Promise< string > => Promise.reject( new Error( 'oops' ) );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toBeInTheDocument();
			} );

			// Backspace dismisses the error
			fireEvent.keyDown( input, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'alert' ) ).not.toBeInTheDocument();
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );
			errorSpy.mockRestore();
		} );

		it( 'clears the error on Backspace after selecting from search', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			const resolver = (): Promise< string > => Promise.reject( new Error( 'oops' ) );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();

			typeSearch( 'Log' );
			fireEvent.click( screen.getByText( 'Logs' ) );

			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Route resolution failed. Backspace to cancel.' );
			expect( input ).toHaveValue( 'Log' );

			// Clear the input first — the handler only fires on Backspace
			// when the input is empty.
			fireEvent.change( input, { target: { value: '' } } );
			fireEvent.keyDown( input, { key: 'Backspace' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'alert' ) ).not.toBeInTheDocument();
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );
			errorSpy.mockRestore();
		} );

		it( 'shows the error when a dependent param resolver rejects', async () => {
			const errorSpy = vi.spyOn( console, 'error' ).mockImplementation( () => {} );
			const onEvent = vi.fn();
			const onNavigate = vi.fn();
			const error = new Error( 'Cannot load env' );
			const resolver = ( param: string ): Promise< string | string[] > | string[] => {
				if ( param === 'appId' ) {
					return [ 'good-app', 'bad-app' ];
				}
				return Promise.reject( error );
			};
			const command = cmd( { id: 'audit', title: 'Audit', route: '/apps/:appId/:env/audit' } );

			render(
				<Commands
					commands={ [ command ] }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
					onEvent={ onEvent }
					showRecent={ false }
				/>
			);
			await openPaletteAndWait();
			onEvent.mockClear();

			// Select the command
			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			// Wait for appId options
			await waitFor( () => {
				expect( screen.getByText( 'bad-app' ) ).toBeInTheDocument();
			} );

			// Click bad-app (not Enter, which would select the first item)
			fireEvent.click( screen.getByText( 'bad-app' ) );

			// Error from dependent env resolver is shown
			await waitFor( () => {
				expect( screen.getByRole( 'alert' ) ).toHaveTextContent( 'Cannot load env' );
			} );

			expect( screen.getByRole( 'status' ) ).toHaveTextContent( '' );
			expect( onNavigate ).not.toHaveBeenCalled();
			expect( onEvent ).toHaveBeenCalledWith( {
				type: 'resolve_error',
				command,
				error,
			} );
			errorSpy.mockRestore();
		} );

		it( 'ignores stale resolver results after dialog close and reopen', async () => {
			const onNavigate = vi.fn();
			let finish: ( value: string ) => void = () => {};
			const resolver = () =>
				new Promise< string >( resolve => {
					finish = resolve;
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					onNavigate={ onNavigate }
					showRecent={ false }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByRole( 'progressbar', { name: 'Loading...' } ) ).toBeInTheDocument();
			} );

			// Close the dialog while resolver is pending
			fireEvent.keyDown( screen.getByRole( 'dialog' ), { key: 'Escape' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );

			// Stale resolver finishes — should be ignored
			finish( '42' );

			// Reopen — should show the normal command list, not navigate
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
				expect(
					screen.queryByRole( 'progressbar', { name: 'Loading...' } )
				).not.toBeInTheDocument();
			} );
			expect( onNavigate ).not.toHaveBeenCalled();
		} );

		it( 'clears loading state when dialog is closed during resolution', async () => {
			const resolver = () =>
				new Promise< string >( () => {
					/* never resolves */
				} );
			const commands = [ cmd( { id: 'logs', title: 'Logs', route: '/apps/:appId/logs' } ) ];

			render(
				<Commands
					commands={ commands }
					triggerKey="Meta+k"
					resolver={ resolver }
					showRecent={ false }
				/>
			);
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
			} );

			const input = screen.getByPlaceholderText( 'Search commands...' );
			fireEvent.keyDown( input, { key: 'Enter' } );

			await waitFor( () => {
				expect( screen.getByRole( 'progressbar', { name: 'Loading...' } ) ).toBeInTheDocument();
			} );

			// Close the dialog
			fireEvent.keyDown( screen.getByRole( 'dialog' ), { key: 'Escape' } );

			await waitFor( () => {
				expect( screen.queryByRole( 'dialog' ) ).not.toBeInTheDocument();
			} );

			// Reopen — should not show the spinner
			openPalette();

			await waitFor( () => {
				expect( screen.getByText( 'Logs' ) ).toBeInTheDocument();
				expect(
					screen.queryByRole( 'progressbar', { name: 'Loading...' } )
				).not.toBeInTheDocument();
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
	const themeCss = readFileSync( resolvePath( 'src/theme.css' ), 'utf8' );

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
			'--cmdk-item-selected-indicator',
			'--cmdk-item-selected-border-width',
			'--cmdk-item-selected-icon-color',
			'--cmdk-item-selected-description-color',
			'--cmdk-input-focus-border',
			'--cmdk-input-icon-fill',
		];

		for ( const variableName of requiredVariables ) {
			expect( themeCss ).toContain( variableName );
		}
	} );

	it( 'keeps dialog defaults as property-level fallbacks', () => {
		const dialogBlock = themeCss.match( /\[cmdk-dialog\]\s*{(?<body>[\s\S]*?)\s*}/ )?.groups?.body;

		expect( dialogBlock ).toBeDefined();
		expect( dialogBlock ).not.toMatch( /^\s*--cmdk-[\w-]+\s*:/m );
		expect( dialogBlock ).toContain(
			'var( --cmdk-bg, var( --wpds-color-bg-surface-neutral, #fff ) )'
		);
	} );

	it( 'exposes the shortcut text variable for theming', () => {
		expect( themeCss ).toContain( '--cmdk-shortcut-text' );
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
			'[cmdk-empty]',
			'[cmdk-loading]',
			'[cmdk-error]',
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
