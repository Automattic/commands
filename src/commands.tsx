import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive, useCommandState } from 'cmdk';
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
	inputSpinner: { 'cmdk-input-spinner': '' },
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

function SpinnerIcon() {
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
			aria-hidden="true"
		>
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
	);
}

interface ResultCountAnnouncementProps {
	itemLabel: string;
	silent: boolean;
}

function ResultCountAnnouncement( { itemLabel, silent }: ResultCountAnnouncementProps ) {
	const count = useCommandState( state => state.filtered.count );
	const label = count === 1 ? itemLabel : `${ itemLabel }s`;
	let message = `${ count } ${ label } found.`;

	if ( silent ) {
		message = '';
	} else if ( count === 0 ) {
		message = `No ${ itemLabel }s found.`;
	}

	return (
		<VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
			{ message }
		</VisuallyHidden>
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
	onEvent,
	showRecent = true,
	recentLimit,
	recentStorageKey,
}: CommandsProps ) {
	const [ open, setOpen ] = useState( false );
	const [ resolving, setResolving ] = useState( false );
	const [ resolveError, setResolveError ] = useState< string | null >( null );
	const [ paramSelection, setParamSelection ] = useState< ParamSelectionState | null >( null );
	const [ paramSearch, setParamSearch ] = useState( '' );
	const previousFocusRef = useRef< HTMLElement | null >( null );
	const resolveGenRef = useRef( 0 );
	const searchGenRef = useRef( 0 );
	const isInitialSearchRef = useRef( true );

	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	useEffect( () => {
		if ( open ) {
			return;
		}

		const previousFocus = previousFocusRef.current;
		previousFocusRef.current = null;

		if ( ! previousFocus?.isConnected ) {
			return;
		}

		const timeoutId = window.setTimeout( () => {
			if ( previousFocus.isConnected ) {
				previousFocus.focus();
			}
		}, 0 );

		return () => {
			window.clearTimeout( timeoutId );
		};
	}, [ open ] );

	const grouped = useMemo( () => groupCommands( commands ), [ commands ] );
	const { recent: recentCommands, addRecent } = useRecentCommands( commands, {
		limit: recentLimit,
		storageKey: recentStorageKey,
	} );

	const resetParamSelection = useCallback( () => {
		resolveGenRef.current += 1;
		searchGenRef.current += 1;
		isInitialSearchRef.current = true;
		setResolving( false );
		setResolveError( null );
		setParamSelection( null );
		setParamSearch( '' );
	}, [] );

	const closePalette = useCallback( () => {
		setOpen( false );
	}, [] );

	const emitNavigationExecuteEvent = useCallback(
		( command: Command, path: string ) => {
			onEvent?.( { type: 'execute', command, commandType: 'route', path } );
		},
		[ onEvent ]
	);

	const emitActionExecuteEvent = useCallback(
		( command: Command ) => {
			onEvent?.( { type: 'execute', command, commandType: 'action' } );
		},
		[ onEvent ]
	);

	const emitResolveErrorEvent = useCallback(
		( command: Command, error: unknown ) => {
			onEvent?.( { type: 'resolve_error', command, error } );
		},
		[ onEvent ]
	);

	const handleOpenChange = useCallback(
		( next: boolean ) => {
			if ( next ) {
				previousFocusRef.current =
					document.activeElement instanceof HTMLElement ? document.activeElement : null;
				if ( ! open ) {
					onEvent?.( { type: 'open' } );
				}
				setOpen( true );
				return;
			}

			closePalette();
			resetParamSelection();
		},
		[ closePalette, onEvent, open, resetParamSelection ]
	);

	useHotkey( triggerKey, () => handleOpenChange( ! open ) );

	const completeNavigation = useCallback(
		( path: string, command: Command ) => {
			emitNavigationExecuteEvent( command, path );
			onNavigate?.( path );
			closePalette();
			resetParamSelection();
		},
		[ closePalette, emitNavigationExecuteEvent, onNavigate, resetParamSelection ]
	);

	const handleSelect = useCallback(
		( item: Command ) => {
			if ( showRecent ) {
				addRecent( item.id );
			}

			if ( item.route ) {
				if ( extractParams( item.route ).length === 0 ) {
					completeNavigation( item.route, item );
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
							completeNavigation( result.path, item );
						} else {
							setParamSelection( {
								command: item,
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
						emitResolveErrorEvent( item, error );
						setResolving( false );
						setResolveError( error instanceof Error ? error.message : 'Route resolution failed' );
					} );
			} else {
				if ( item.action ) {
					item.action();
					emitActionExecuteEvent( item );
				}
				closePalette();
			}
		},
		[
			addRecent,
			closePalette,
			completeNavigation,
			emitActionExecuteEvent,
			emitResolveErrorEvent,
			resolver,
			showRecent,
		]
	);

	const handleParamOptionSelect = useCallback(
		( value: string ) => {
			if ( ! paramSelection ) {
				return;
			}
			setParamSearch( '' );
			searchGenRef.current += 1;
			isInitialSearchRef.current = true;
			const current = paramSelection.pending[ 0 ];
			const updatedPath = replaceRouteParam( paramSelection.path, current.name, value );
			const remaining = paramSelection.pending.slice( 1 );
			const updatedSelections = { ...paramSelection.selections, [ current.name ]: value };

			if ( remaining.length === 0 ) {
				completeNavigation( updatedPath, paramSelection.command );
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
						completeNavigation( result.path, paramSelection.command );
					} else {
						setParamSelection( {
							command: paramSelection.command,
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
					emitResolveErrorEvent( paramSelection.command, error );
					setResolving( false );
					setResolveError( error instanceof Error ? error.message : 'Route resolution failed' );
				} );
		},
		[ paramSelection, completeNavigation, emitResolveErrorEvent, resolver ]
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

	// Debounced search: re-call the resolver for the current param when the
	// user types during param selection, enabling server-side filtering.
	// On initial mount (before the user has typed anything), options already
	// come from resolveRoute so we skip the call. Once the user has typed
	// and then clears the input, we re-call with search="" to restore
	// unfiltered options.
	useEffect( () => {
		if ( ! paramSelection || ! resolver || ! currentParam ) {
			return;
		}
		if ( paramSearch === '' && isInitialSearchRef.current ) {
			return;
		}
		isInitialSearchRef.current = false;

		const gen = ++searchGenRef.current;

		const timeoutId = setTimeout( () => {
			setResolving( true );
			void Promise.resolve( resolver( currentParam.name, paramSelection.selections, paramSearch ) )
				.then( result => {
					if ( gen !== searchGenRef.current ) {
						return;
					}
					setResolving( false );
					if ( Array.isArray( result ) ) {
						setParamSelection( prev => {
							if ( ! prev ) {
								return null;
							}
							return {
								...prev,
								pending: [
									{ name: currentParam.name, options: result },
									...prev.pending.slice( 1 ),
								],
							};
						} );
					}
				} )
				.catch( ( error: unknown ) => {
					if ( gen !== searchGenRef.current ) {
						return;
					}
					// eslint-disable-next-line no-console
					console.error( '[@automattic/commands] Search resolution failed:', error );
					setResolving( false );
					setResolveError( error instanceof Error ? error.message : 'Search resolution failed' );
				} );
		}, 300 );

		return () => clearTimeout( timeoutId );
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when paramSearch changes
	}, [ paramSearch ] );

	const inputLabel = currentParam ? `Select ${ currentParam.name }` : 'Search commands';
	let inputPlaceholder = currentParam
		? `Select ${ currentParam.name }. Backspace to cancel.`
		: placeholder;

	if ( resolveError ) {
		inputPlaceholder = 'Route resolution failed. Backspace to cancel.';
	}

	return (
		<CommandPrimitive.Dialog
			key={ currentParam?.name ?? 'commands' }
			open={ open }
			onOpenChange={ handleOpenChange }
			label={ inputLabel }
			filter={ paramSelection ? undefined : filter }
			loop
		>
			<VisuallyHidden>
				<Dialog.Title>Command palette</Dialog.Title>
				<Dialog.Description>Search and run commands</Dialog.Description>
			</VisuallyHidden>
			<ResultCountAnnouncement
				itemLabel={ currentParam ? 'option' : 'command' }
				silent={ resolving || Boolean( resolveError ) }
			/>
			<div { ...themeAttributes.inputWrapper }>
				<SearchIcon />
				<CommandPrimitive.Input
					aria-label={ inputLabel }
					placeholder={ inputPlaceholder }
					onKeyDown={ paramSelection || resolveError ? handleParamKeyDown : undefined }
					onValueChange={ paramSelection ? setParamSearch : undefined }
				/>
				{ resolving && (
					<span
						{ ...themeAttributes.inputSpinner }
						role="progressbar"
						aria-label="Loading..."
					>
						<SpinnerIcon />
					</span>
				) }
			</div>
			<CommandPrimitive.List aria-busy={ resolving || undefined }>
				<CommandListContent
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
