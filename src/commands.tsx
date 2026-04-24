import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command as CommandPrimitive } from 'cmdk';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupCommands } from './group-commands';
import { useHotkey } from './hooks/use-hotkey';
import { validateCommands } from './validate-commands';

import type { Command, CommandsProps } from './types';
import './theme.css';

const themeAttributes = {
	inputWrapper: { 'cmdk-input-wrapper': '' },
	itemIcon: { 'cmdk-item-icon': '' },
	itemContent: { 'cmdk-item-content': '' },
	itemTitle: { 'cmdk-item-title': '' },
	itemDescription: { 'cmdk-item-description': '' },
	itemShortcut: { 'cmdk-item-shortcut': '' },
	itemType: { 'cmdk-item-type': '' },
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
	placeholder = 'Search commands...',
	filter,
	emptyState,
	triggerKey = 'Mod+k',
	onNavigate,
}: CommandsProps ) {
	const [ open, setOpen ] = useState( false );
	useEffect( () => {
		validateCommands( commands );
	}, [ commands ] );

	useHotkey( triggerKey, () => {
		setOpen( prev => ! prev );
	} );

	const grouped = useMemo( () => groupCommands( commands ), [ commands ] );

	const handleSelect = useCallback(
		( item: Command ) => {
			if ( item.route ) {
				onNavigate?.( item.route );
			} else {
				item.action?.();
			}
			setOpen( false );
		},
		[ onNavigate ]
	);

	return (
		<CommandPrimitive.Dialog
			open={ open }
			onOpenChange={ setOpen }
			label="Command palette"
			filter={ filter }
			loop
		>
			<VisuallyHidden>
				<Dialog.Title>Command palette</Dialog.Title>
				<Dialog.Description>Search and run commands</Dialog.Description>
			</VisuallyHidden>
			<div { ...themeAttributes.inputWrapper }>
				<SearchIcon />
				<CommandPrimitive.Input placeholder={ placeholder } />
			</div>
			<CommandPrimitive.List>
				<CommandPrimitive.Empty>{ emptyState ?? 'No results found.' }</CommandPrimitive.Empty>
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
	onSelect: () => void;
}
function CommandItem( { command, onSelect }: CommandItemProps ) {
	const typeLabel = command.route ? 'Link' : 'Action';

	return (
		<CommandPrimitive.Item value={ command.id } keywords={ command.keywords } onSelect={ onSelect }>
			{ command.icon && <span { ...themeAttributes.itemIcon }>{ command.icon }</span> }
			<span { ...themeAttributes.itemContent }>
				<span { ...themeAttributes.itemTitle }>{ command.title }</span>
				{ command.description && (
					<span { ...themeAttributes.itemDescription }>{ command.description }</span>
				) }
			</span>
			{ command.shortcut ? (
				<span { ...themeAttributes.itemShortcut }>{ command.shortcut }</span>
			) : (
				<span { ...themeAttributes.itemType }>{ typeLabel }</span>
			) }
		</CommandPrimitive.Item>
	);
}

export { Commands };
