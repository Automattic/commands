import { Command as CommandPrimitive } from 'cmdk';

import type { Command, CommandListContentProps } from './types';

const themeAttributes = {
	itemIcon: { 'cmdk-item-icon': '' },
	itemContent: { 'cmdk-item-content': '' },
	itemTitle: { 'cmdk-item-title': '' },
	itemDescription: { 'cmdk-item-description': '' },
	itemShortcut: { 'cmdk-item-shortcut': '' },
	itemType: { 'cmdk-item-type': '' },
} as const;

export function CommandListContent( {
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
		return <CommandPrimitive.Loading>Loading...</CommandPrimitive.Loading>;
	}

	if ( ! paramSelection ) {
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

	// Selecting a param, but no options are available.
	if ( ! currentParam?.options ) {
		return (
			<CommandPrimitive.Empty>
				No options available for { currentParam?.name }.
			</CommandPrimitive.Empty>
		);
	}

	// Selecting a param, and options are available.
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
						<span { ...themeAttributes.itemContent }>
							<span { ...themeAttributes.itemTitle }>{ option }</span>
						</span>
					</CommandPrimitive.Item>
				) ) }
			</CommandPrimitive.Group>
		</>
	);
}

/* ---------- Command item ---------- */

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
			{ command.icon && (
				<span { ...themeAttributes.itemIcon } aria-hidden="true">
					{ command.icon }
				</span>
			) }
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
