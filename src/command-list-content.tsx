import { Command as CommandPrimitive } from 'cmdk';

import type { UnresolvedParam } from './resolve-route';
import type { Command, CommandsProps } from './types';

/* ---------- param-selection sub-layer state ---------- */

export interface ParamSelectionState {
	/** The partially-resolved route path */
	path: string;
	/** Queue of params that still need a user selection */
	pending: UnresolvedParam[];
}

/* ---------- List content ---------- */

export interface CommandListContentProps {
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
