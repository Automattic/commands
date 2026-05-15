import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CommandListContent } from './command-list-content';
import { groupCommands } from './group-commands';
import { useFocusRestore } from './hooks/use-focus-restore';
import { useHotkey } from './hooks/use-hotkey';
import { useRecentCommands } from './hooks/use-recent-commands';
import { mergeLocaleText } from './locale-text';
import { extractParams, replaceRouteParam, resolveRoute } from './resolve-route';
import { validateCommands } from './validate-commands';

import type {
	Command,
	CommandsLocaleText,
	CommandsProps,
	ParamSelectionState,
	ResolvedOption,
	ResultItemType,
} from './types';
import './theme.css';

const themeAttributes = {
	inputWrapper: { 'cmdk-input-wrapper': '' },
	inputSpinner: { 'cmdk-input-spinner': '' },
	breadcrumb: { 'cmdk-breadcrumb': '' },
	breadcrumbItem: { 'cmdk-breadcrumb-item': '' },
	breadcrumbSeparator: { 'cmdk-breadcrumb-separator': '' },
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

interface BreadcrumbProps {
	commandTitle: string;
	steps: string[];
	label: string;
}

function Breadcrumb( { commandTitle, steps, label }: BreadcrumbProps ) {
	const trail = [ commandTitle, ...steps ];
	return (
		<div { ...themeAttributes.breadcrumb } aria-label={ label }>
			{ trail.map( ( itemLabel, index ) => (
				<Fragment key={ index }>
					{ index > 0 && (
						<span { ...themeAttributes.breadcrumbSeparator } aria-hidden="true">
							/
						</span>
					) }
					<span { ...themeAttributes.breadcrumbItem }>{ itemLabel }</span>
				</Fragment>
			) ) }
		</div>
	);
}

function getInputCopy( {
	currentParam,
	resolveError,
	placeholder,
	localeText,
}: {
	currentParam: { name: string } | null;
	resolveError: string | null;
	placeholder: string;
	localeText: CommandsLocaleText;
} ): { label: string; placeholder: string } {
	const label = currentParam
		? localeText.selectParamLabel( currentParam.name )
		: localeText.searchInputLabel;

	if ( resolveError ) {
		return { label, placeholder: localeText.routeResolutionFailedPlaceholder };
	}

	if ( currentParam ) {
		return { label, placeholder: localeText.selectParamPlaceholder( currentParam.name ) };
	}

	return { label, placeholder };
}

interface ResultCountAnnouncementProps {
	itemType: ResultItemType;
	localeText: CommandsLocaleText;
	silent: boolean;
}

function ResultCountAnnouncement( { itemType, localeText, silent }: ResultCountAnnouncementProps ) {
	const count = useCommandState( state => state.filtered.count );
	let message = '';

	if ( ! silent ) {
		message =
			count === 0
				? localeText.noResultsCount( itemType )
				: localeText.resultCount( count, itemType );
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
	placeholder,
	localeText,
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
	const [ paramSelectionHistory, setParamSelectionHistory ] = useState< ParamSelectionState[] >(
		[]
	);
	const [ paramSearch, setParamSearch ] = useState( '' );
	const resolveGenRef = useRef( 0 );
	const searchGenRef = useRef( 0 );
	const isInitialSearchRef = useRef( true );
	const { captureFocus } = useFocusRestore( open );
	const mergedLocaleText = mergeLocaleText( localeText );
	const resolvedPlaceholder = placeholder ?? mergedLocaleText.searchPlaceholder;
	const resolvedEmptyState = emptyState ?? mergedLocaleText.noResults;

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
		searchGenRef.current += 1;
		isInitialSearchRef.current = true;
		setResolving( false );
		setResolveError( null );
		setParamSelection( null );
		setParamSelectionHistory( [] );
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
				captureFocus();
				if ( ! open ) {
					onEvent?.( { type: 'open' } );
				}
				setOpen( true );
				return;
			}

			closePalette();
			resetParamSelection();
		},
		[ captureFocus, closePalette, onEvent, open, resetParamSelection ]
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
								breadcrumbs: [],
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
						setResolveError(
							error instanceof Error ? error.message : mergedLocaleText.routeResolutionFailed
						);
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
			mergedLocaleText.routeResolutionFailed,
			resolver,
			showRecent,
		]
	);

	const handleParamOptionSelect = useCallback(
		( option: ResolvedOption ) => {
			if ( ! paramSelection ) {
				return;
			}
			const value = typeof option === 'string' ? option : option.value;
			const label = typeof option === 'string' ? option : option.label;
			setParamSearch( '' );
			searchGenRef.current += 1;
			isInitialSearchRef.current = true;
			const current = paramSelection.pending[ 0 ];
			const updatedPath = replaceRouteParam( paramSelection.path, current.name, value );
			const remaining = paramSelection.pending.slice( 1 );
			const updatedSelections = { ...paramSelection.selections, [ current.name ]: value };
			const updatedBreadcrumbs = [ ...paramSelection.breadcrumbs, label ];

			if ( remaining.length === 0 ) {
				completeNavigation( updatedPath, paramSelection.command );
				return;
			}

			// Immediately transition to the next param menu so the user sees
			// progress instead of waiting on the current menu.
			setParamSelectionHistory( prev => [ ...prev, paramSelection ] );
			setParamSelection( {
				command: paramSelection.command,
				path: updatedPath,
				pending: remaining,
				selections: updatedSelections,
				breadcrumbs: updatedBreadcrumbs,
			} );

			// Re-resolve remaining params in the background so dependent
			// options can load.  The list shows a loading indicator until
			// this completes.
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
							breadcrumbs: updatedBreadcrumbs,
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
					setResolveError(
						error instanceof Error ? error.message : mergedLocaleText.routeResolutionFailed
					);
				} );
		},
		[
			paramSelection,
			completeNavigation,
			emitResolveErrorEvent,
			mergedLocaleText.routeResolutionFailed,
			resolver,
		]
	);

	const stepBackParamSelection = useCallback( () => {
		resolveGenRef.current += 1;
		searchGenRef.current += 1;
		isInitialSearchRef.current = true;
		setResolving( false );
		setParamSearch( '' );

		if ( paramSelectionHistory.length === 0 ) {
			resetParamSelection();
			return;
		}

		const previous = paramSelectionHistory[ paramSelectionHistory.length - 1 ];
		setParamSelectionHistory( prev => prev.slice( 0, -1 ) );
		setParamSelection( previous );
	}, [ paramSelectionHistory, resetParamSelection ] );

	const handleParamKeyDown = useCallback(
		( event: React.KeyboardEvent< HTMLInputElement > ) => {
			if ( resolveError && event.key === 'Backspace' ) {
				resetParamSelection();
				return;
			}

			if ( event.key === 'Backspace' && event.currentTarget.value === '' ) {
				stepBackParamSelection();
			}
		},
		[ resetParamSelection, resolveError, stepBackParamSelection ]
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
					setResolveError(
						error instanceof Error ? error.message : mergedLocaleText.searchResolutionFailed
					);
				} );
		}, 300 );

		return () => clearTimeout( timeoutId );
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when paramSearch changes
	}, [ paramSearch ] );

	const { label: inputLabel, placeholder: inputPlaceholder } = getInputCopy( {
		currentParam,
		resolveError,
		placeholder: resolvedPlaceholder,
		localeText: mergedLocaleText,
	} );

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
				<Dialog.Title>{ mergedLocaleText.dialogTitle }</Dialog.Title>
				<Dialog.Description>{ mergedLocaleText.dialogDescription }</Dialog.Description>
			</VisuallyHidden>
			<ResultCountAnnouncement
				itemType={ currentParam ? 'option' : 'command' }
				localeText={ mergedLocaleText }
				silent={ resolving || Boolean( resolveError ) }
			/>
			{ paramSelection && ! resolveError && (
				<Breadcrumb
					commandTitle={ paramSelection.command.title }
					steps={ paramSelection.breadcrumbs }
					label={ mergedLocaleText.selectionContext }
				/>
			) }
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
						aria-label={ mergedLocaleText.loading }
					>
						<SpinnerIcon />
					</span>
				) }
			</div>
			<CommandPrimitive.List
				aria-busy={ resolving || undefined }
				label={ mergedLocaleText.commandListLabel }
			>
				<CommandListContent
					resolveError={ resolveError }
					resolving={ resolving }
					paramSelection={ paramSelection }
					currentParam={ currentParam }
					emptyState={ resolvedEmptyState }
					showRecent={ showRecent }
					recentCommands={ recentCommands }
					grouped={ grouped }
					onSelect={ handleSelect }
					onParamOptionSelect={ handleParamOptionSelect }
					localeText={ mergedLocaleText }
				/>
			</CommandPrimitive.List>
		</CommandPrimitive.Dialog>
	);
}

export { Commands };
