import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive } from 'cmdk';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupCommands } from './group-commands';
import { useHotkey } from './hooks/use-hotkey';
import { useRecentCommands } from './hooks/use-recent-commands';
import { validateCommands } from './validate-commands';

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

/* ---------- Commands component ---------- */

function Commands( {
	commands,
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
	const [ search, setSearch ] = useState( '' );
	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	useHotkey( triggerKey, () => {
		if ( open ) {
			setSearch( '' );
			setOpen( false );
		} else {
			setOpen( true );
		}
	} );

	const handleOpenChange = useCallback( ( nextOpen: boolean ) => {
		if ( ! nextOpen ) {
			setSearch( '' );
		}
		setOpen( nextOpen );
	}, [] );

	const grouped = useMemo( () => groupCommands( commands ), [ commands ] );
	const { recent: recentCommands, addRecent } = useRecentCommands( commands, {
		limit: recentLimit,
		storageKey: recentStorageKey,
	} );
	const shouldShowRecent = showRecent && search.length === 0 && recentCommands.length > 0;

	const handleSelect = useCallback(
		( item: Command ) => {
			addRecent( item.id );
			if ( item.route ) {
				onNavigate?.( item.route );
			} else {
				item.action?.();
			}
			setSearch( '' );
			setOpen( false );
		},
		[ addRecent, onNavigate ]
	);

	return (
		<CommandPrimitive.Dialog
			open={ open }
			onOpenChange={ handleOpenChange }
			label="Command palette"
			filter={ filter }
			loop
		>
			<VisuallyHidden>
				<Dialog.Title>Command palette</Dialog.Title>
				<Dialog.Description>Search and run commands</Dialog.Description>
			</VisuallyHidden>
			<div data-cmdk-input-wrapper="">
				<SearchIcon />
				<CommandPrimitive.Input
					placeholder={ placeholder }
					value={ search }
					onValueChange={ setSearch }
				/>
			</div>
			<CommandPrimitive.List>
				<CommandPrimitive.Empty>{ emptyState ?? 'No results found.' }</CommandPrimitive.Empty>
				{ shouldShowRecent && (
					<CommandPrimitive.Group heading="Recently Used">
						{ recentCommands.map( item => (
							<CommandItem
								key={ item.id }
								command={ item }
								value={ `recent:${ item.id }` }
								onSelect={ () => handleSelect( item ) }
							/>
						) ) }
					</CommandPrimitive.Group>
				) }
				{ Array.from( grouped.entries() ).map( ( [ group, items ] ) =>
					group ? (
						<CommandPrimitive.Group key={ group } heading={ group }>
							{ items.map( item => (
								<CommandItem
									key={ item.id }
									command={ item }
									onSelect={ () => handleSelect( item ) }
								/>
							) ) }
						</CommandPrimitive.Group>
					) : (
						items.map( item => (
							<CommandItem
								key={ item.id }
								command={ item }
								onSelect={ () => handleSelect( item ) }
							/>
						) )
					)
				) }
			</CommandPrimitive.List>
		</CommandPrimitive.Dialog>
	);
}

interface CommandItemProps {
	command: Command;
	value?: string;
	onSelect: () => void;
}

function CommandItem( { command, value = command.id, onSelect }: CommandItemProps ) {
	const typeLabel = command.route ? 'Link' : 'Action';

	return (
		<CommandPrimitive.Item value={ value } keywords={ command.keywords } onSelect={ onSelect }>
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
