import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive } from 'cmdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { groupCommands } from './group-commands';
import { useHotkey } from './hooks/use-hotkey';
import { useRecentCommands } from './hooks/use-recent-commands';
import { extractParams, replaceRouteParam, resolveRoute } from './resolve-route';
import { validateCommands } from './validate-commands';

import type { UnresolvedParam } from './resolve-route';
import type { Command, CommandsProps } from './types';
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

/* ---------- param-selection sub-layer state ---------- */

interface ParamSelectionState {
	/** The partially-resolved route path */
	path: string;
	/** Queue of params that still need a user selection */
	pending: UnresolvedParam[];
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

	useHotkey( triggerKey, () => handleOpenChange( ! open ) );

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
			label={ currentParam ? `Select ${ currentParam.name }` : 'Command palette' }
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
					placeholder={ currentParam ? `Select ${ currentParam.name }...` : placeholder }
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

/* ---------- List content ---------- */

interface CommandListContentProps {
	resolving: boolean;
	paramSelection: ParamSelectionState | null;
	currentParam: UnresolvedParam | null;
	emptyState: CommandsProps[ 'emptyState' ];
	shouldShowRecent: boolean;
	recentCommands: Command[];
	grouped: Map< string, Command[] >;
	onSelect: ( item: Command ) => void;
	onParamOptionSelect: ( value: string ) => void;
}

function CommandListContent( {
	resolving,
	paramSelection,
	currentParam,
	emptyState,
	shouldShowRecent,
	recentCommands,
	grouped,
	onSelect,
	onParamOptionSelect,
}: CommandListContentProps ) {
	if ( resolving ) {
		return (
			<CommandPrimitive.Loading>
				<div data-cmdk-loading="">Resolving…</div>
			</CommandPrimitive.Loading>
		);
	}

	if ( paramSelection ) {
		if ( ! currentParam?.options ) {
			return (
				<CommandPrimitive.Empty>
					No options available for { currentParam?.name }.
				</CommandPrimitive.Empty>
			);
		}

		return (
			<>
				<CommandPrimitive.Empty>No matching options.</CommandPrimitive.Empty>
				<CommandPrimitive.Group heading={ `Choose ${ currentParam.name }` }>
					{ currentParam.options.map( option => (
						<CommandPrimitive.Item
							key={ option }
							value={ option }
							onSelect={ () => onParamOptionSelect( option ) }
						>
							<span data-slot="label">
								<span data-slot="title">{ option }</span>
							</span>
						</CommandPrimitive.Item>
					) ) }
				</CommandPrimitive.Group>
			</>
		);
	}

	return (
		<>
			<CommandPrimitive.Empty>{ emptyState ?? 'No results found.' }</CommandPrimitive.Empty>
			{ shouldShowRecent && (
				<CommandPrimitive.Group heading="Recently Used">
					{ recentCommands.map( item => (
						<CommandItem
							key={ item.id }
							command={ item }
							value={ `recent:${ item.id }` }
							onSelect={ () => onSelect( item ) }
						/>
					) ) }
				</CommandPrimitive.Group>
			) }
			{ Array.from( grouped.entries() ).map( ( [ group, items ] ) =>
				group ? (
					<CommandPrimitive.Group key={ group } heading={ group }>
						{ items.map( item => (
							<CommandItem key={ item.id } command={ item } onSelect={ () => onSelect( item ) } />
						) ) }
					</CommandPrimitive.Group>
				) : (
					items.map( item => (
						<CommandItem key={ item.id } command={ item } onSelect={ () => onSelect( item ) } />
					) )
				)
			) }
		</>
	);
}

interface CommandItemProps {
	command: Command;
	value?: string;
	onSelect: () => void;
}

function CommandItem( { command, value = command.id, onSelect }: CommandItemProps ) {
	const typeLabel = command.route ? 'Link' : 'Action';
	const keywords = [ command.title, ...( command.keywords ?? [] ) ];

	return (
		<CommandPrimitive.Item value={ value } keywords={ keywords } onSelect={ onSelect }>
			{ command.icon && <span data-slot="icon">{ command.icon }</span> }
			<span data-slot="label">
				<span data-slot="title">{ command.title }</span>
				{ command.description && <span data-slot="description">{ command.description }</span> }
			</span>
			{ command.shortcut ? (
				<span data-slot="shortcut">{ command.shortcut }</span>
			) : (
				<span data-slot="type">{ typeLabel }</span>
			) }
		</CommandPrimitive.Item>
	);
}

export { Commands };
