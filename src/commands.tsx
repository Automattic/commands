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
	const shouldShowRecent = showRecent && recentCommands.length > 0;

	const resetParamSelection = useCallback( () => {
		resolveGenRef.current += 1;
		setResolving( false );
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
				void resolveRoute( item.route, resolver )
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
							} );
						}
					} )
					.catch( ( error: unknown ) => {
						if ( gen !== resolveGenRef.current ) {
							return;
						}
						// eslint-disable-next-line no-console
						console.error( '[@automattic/commands] Route resolution failed:', error );
						resetParamSelection();
					} );
			} else {
				item.action?.();
				setOpen( false );
			}
		},
		[ addRecent, completeNavigation, resetParamSelection, resolver, showRecent ]
	);

	const handleParamOptionSelect = useCallback(
		( value: string ) => {
			if ( ! paramSelection ) {
				return;
			}
			const current = paramSelection.pending[ 0 ];
			const updatedPath = replaceRouteParam( paramSelection.path, current.name, value );
			const remaining = paramSelection.pending.slice( 1 );

			if ( remaining.length === 0 ) {
				completeNavigation( updatedPath );
			} else {
				setParamSelection( { path: updatedPath, pending: remaining } );
			}
		},
		[ paramSelection, completeNavigation ]
	);

	const handleParamKeyDown = useCallback(
		( event: React.KeyboardEvent< HTMLInputElement > ) => {
			if ( event.key === 'Backspace' && event.currentTarget.value === '' ) {
				resetParamSelection();
			}
		},
		[ resetParamSelection ]
	);

	const currentParam = paramSelection?.pending[ 0 ] ?? null;

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
			<div data-cmdk-input-wrapper="">
				<SearchIcon />
				<CommandPrimitive.Input
					placeholder={
						currentParam ? `Select ${ currentParam.name }. Backspace to cancel.` : placeholder
					}
					onKeyDown={ paramSelection ? handleParamKeyDown : undefined }
				/>
			</div>
			<CommandPrimitive.List>
				<CommandListContent
					resolving={ resolving }
					paramSelection={ paramSelection }
					currentParam={ currentParam }
					emptyState={ emptyState }
					shouldShowRecent={ shouldShowRecent }
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
