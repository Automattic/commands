import { Command as CommandPrimitive, useCommandState } from 'cmdk';

import type { Command, CommandListContentProps, ResolvedOption } from './types';

const themeAttributes = {
	itemIcon: { 'cmdk-item-icon': '' },
	itemContent: { 'cmdk-item-content': '' },
	itemTitle: { 'cmdk-item-title': '' },
	itemDescription: { 'cmdk-item-description': '' },
	itemShortcut: { 'cmdk-item-shortcut': '' },
	error: { 'cmdk-error': '' },
} as const;

export function CommandListContent( {
	resolveError,
	resolving,
	paramSelection,
	currentParam,
	emptyState,
	showRecent,
	recentCommands,
	grouped,
	onSelect,
	onParamOptionSelect,
}: CommandListContentProps ) {
	const search = useCommandState( state => state.search );
	const shouldShowRecent = showRecent && search === '' && recentCommands.length > 0;

	if ( resolveError ) {
		return (
			<div { ...themeAttributes.error } role="alert">
				{ resolveError }
			</div>
		);
	}

	if ( ! paramSelection ) {
		return (
			<>
				<CommandPrimitive.Empty>
					{ resolving ? 'Loading...' : emptyState ?? 'No results found.' }
				</CommandPrimitive.Empty>
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
				{ resolving ? 'Loading...' : `No options available for ${ currentParam?.name }.` }
			</CommandPrimitive.Empty>
		);
	}

	// Selecting a param, and options are available.
	return (
		<>
			<CommandPrimitive.Empty>
				{ resolving ? 'Loading...' : 'No matching options.' }
			</CommandPrimitive.Empty>
			<CommandPrimitive.Group heading={ `Choose ${ currentParam.name }` }>
				{ currentParam.options.map( option => (
					<OptionItem
						key={ optionValue( option ) }
						option={ option }
						onSelect={ onParamOptionSelect }
					/>
				) ) }
			</CommandPrimitive.Group>
		</>
	);
}

/* ---------- Option helpers ---------- */

function optionLabel( option: ResolvedOption ): string {
	return typeof option === 'string' ? option : option.label;
}

function optionValue( option: ResolvedOption ): string {
	return typeof option === 'string' ? option : option.value;
}

/* ---------- Option item ---------- */

interface OptionItemProps {
	option: ResolvedOption;
	onSelect: ( option: ResolvedOption ) => void;
}

function OptionItem( { option, onSelect }: OptionItemProps ) {
	const label = optionLabel( option );
	const value = optionValue( option );
	const isLabeled = typeof option !== 'string';
	const icon = isLabeled ? option.icon : undefined;
	const description = isLabeled ? option.description : undefined;
	const extraKeywords = isLabeled ? option.keywords ?? [] : [];
	const keywords = [ label, ...extraKeywords ];

	return (
		<CommandPrimitive.Item
			value={ `${ label }:${ value }` }
			keywords={ keywords }
			onSelect={ () => onSelect( option ) }
		>
			{ icon && (
				<span { ...themeAttributes.itemIcon } aria-hidden="true">
					{ icon }
				</span>
			) }
			<span { ...themeAttributes.itemContent }>
				<span { ...themeAttributes.itemTitle }>{ label }</span>
				{ description && <span { ...themeAttributes.itemDescription }>{ description }</span> }
			</span>
		</CommandPrimitive.Item>
	);
}

/* ---------- Command item ---------- */

interface CommandItemProps {
	command: Command;
	value?: string;
	onSelect: () => void;
}

function CommandItem( { command, value = command.id, onSelect }: CommandItemProps ) {
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
			{ command.shortcut && <span { ...themeAttributes.itemShortcut }>{ command.shortcut }</span> }
		</CommandPrimitive.Item>
	);
}
