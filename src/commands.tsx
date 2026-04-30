import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive } from 'cmdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CommandListContent } from './command-list-content';
import { groupCommands } from './group-commands';
import { useHotkey } from './hooks/use-hotkey';
import { useRecentCommands } from './hooks/use-recent-commands';
import { extractParams, replaceRouteParam, resolveRoute } from './resolve-route';
import { validateCommands } from './validate-commands';

import type { Command, CommandsProps, ParamSelectionState } from './types';
import './theme.css';

const themeAttributes = {
	inputWrapper: { 'cmdk-input-wrapper': '' },
} as const;

function SearchIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}

/* ---------- Commands component ---------- */

function Commands( {
	commands,
	resolver,
	placeholder = 'Search commands...',
	filter,
	emptyState,
	triggerKey = 'Mod+k',
	onNavigate,
	showRecent = true,
	recentLimit,
	recentStorageKey,
}: CommandsProps ) {
	const [ open, setOpen ] = useState( false );
	const [ resolving, setResolving ] = useState( false );
	const [ resolveError, setResolveError ] = useState< string | null >( null );
	const [ paramSelection, setParamSelection ] = useState< ParamSelectionState | null >( null );
	const resolveGenRef = useRef( 0 );

	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	const grouped = useMemo( () => groupCommands( commands ), [ commands ] );
	const { recent: recentCommands, addRecent } = useRecentCommands( commands, {
		limit: recentLimit,
		storageKey: recentStorageKey,
	} );

	const resetParamSelection = useCallback( () => {
		resolveGenRef.current += 1;
		setResolving( false );
		setResolveError( null );
		setParamSelection( null );
	}, [] );

	const handleOpenChange = useCallback(
		( next: boolean ) => {
			setOpen( next );
			if ( ! next ) {
				resetParamSelection();
			}
		},
		[ resetParamSelection ]
	);

	useHotkey( triggerKey, () => handleOpenChange( ! open ) );

	const completeNavigation = useCallback(
		( path: string ) => {
			onNavigate?.( path );
			setOpen( false );
			resetParamSelection();
		},
		[ onNavigate, resetParamSelection ]
	);

	const handleSelect = useCallback(
		( item: Command ) => {
			if ( showRecent ) {
				addRecent( item.id );
			}

			if ( item.route ) {
				if ( extractParams( item.route ).length === 0 ) {
					completeNavigation( item.route );
					return;
				}

				const gen = ++resolveGenRef.current;
				setResolving( true );
				void resolveRoute( item.route, resolver, {} )
					.then( result => {
						if ( gen !== resolveGenRef.current ) {
							return;
						}
						setResolving( false );
						if ( result.unresolved.length === 0 ) {
							completeNavigation( result.path );
						} else {
							setParamSelection( {
								path: result.path,
								pending: result.unresolved,
								selections: result.selections,
							} );
						}
					} )
					.catch( ( error: unknown ) => {
						if ( gen !== resolveGenRef.current ) {
							return;
						}
						// eslint-disable-next-line no-console
						console.error( '[@automattic/commands] Route resolution failed:', error );
						setResolving( false );
						setResolveError( error instanceof Error ? error.message : 'Route resolution failed' );
					} );
			} else {
				item.action?.();
				setOpen( false );
			}
		},
		[ addRecent, completeNavigation, resolver, showRecent ]
	);

	const handleParamOptionSelect = useCallback(
		( value: string ) => {
			if ( ! paramSelection ) {
				return;
			}
			const current = paramSelection.pending[ 0 ];
			const updatedPath = replaceRouteParam( paramSelection.path, current.name, value );
			const remaining = paramSelection.pending.slice( 1 );
			const updatedSelections = { ...paramSelection.selections, [ current.name ]: value };

			if ( remaining.length === 0 ) {
				completeNavigation( updatedPath );
				return;
			}

			// Re-resolve remaining params so dependent options can update.
			const gen = ++resolveGenRef.current;
			setResolving( true );
			void resolveRoute( updatedPath, resolver, updatedSelections )
				.then( result => {
					if ( gen !== resolveGenRef.current ) {
						return;
					}
					setResolving( false );
					if ( result.unresolved.length === 0 ) {
						completeNavigation( result.path );
					} else {
						setParamSelection( {
							path: result.path,
							pending: result.unresolved,
							selections: result.selections,
						} );
					}
				} )
				.catch( ( error: unknown ) => {
					if ( gen !== resolveGenRef.current ) {
						return;
					}
					// eslint-disable-next-line no-console
					console.error( '[@automattic/commands] Route resolution failed:', error );
					setResolving( false );
					setResolveError( error instanceof Error ? error.message : 'Route resolution failed' );
				} );
		},
		[ paramSelection, completeNavigation, resolver ]
	);

	const handleParamKeyDown = useCallback(
		( event: React.KeyboardEvent< HTMLInputElement > ) => {
			if ( resolveError && event.key === 'Backspace' ) {
				resetParamSelection();
				return;
			}

			if ( event.key === 'Backspace' && event.currentTarget.value === '' ) {
				resetParamSelection();
			}
		},
		[ resetParamSelection, resolveError ]
	);

	const currentParam = paramSelection?.pending[ 0 ] ?? null;
	let placeholderText = currentParam
		? `Select ${ currentParam.name }. Backspace to cancel.`
		: placeholder;

	if ( resolveError ) {
		placeholderText = 'Route resolution failed. Backspace to cancel.';
	}

	return (
		<CommandPrimitive.Dialog
			key={ currentParam?.name ?? 'commands' }
			open={ open }
			onOpenChange={ handleOpenChange }
			label={
				currentParam ? `Select ${ currentParam.name }. Backspace to cancel.` : 'Command palette'
			}
			filter={ paramSelection ? undefined : filter }
			loop
		>
			<VisuallyHidden>
				<Dialog.Title>Command palette</Dialog.Title>
				<Dialog.Description>Search and run commands</Dialog.Description>
			</VisuallyHidden>
			<div { ...themeAttributes.inputWrapper }>
				<SearchIcon />
				<CommandPrimitive.Input
					placeholder={ placeholderText }
					onKeyDown={ paramSelection || resolveError ? handleParamKeyDown : undefined }
				/>
			</div>
			<CommandPrimitive.List>
				<CommandListContent
					resolving={ resolving }
					resolveError={ resolveError }
					paramSelection={ paramSelection }
					currentParam={ currentParam }
					emptyState={ emptyState }
					showRecent={ showRecent }
					recentCommands={ recentCommands }
					grouped={ grouped }
					onSelect={ handleSelect }
					onParamOptionSelect={ handleParamOptionSelect }
				/>
			</CommandPrimitive.List>
		</CommandPrimitive.Dialog>
	);
}

export { Commands };
