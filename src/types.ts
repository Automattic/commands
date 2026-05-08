import type { ReactNode } from 'react';

/**
 * A labeled value pairs a human-readable label with the underlying value
 * that gets substituted into the route.
 */
export interface LabeledValue {
	label: string;
	value: string;
}

/** A single resolver option — either a plain string or a labeled value. */
export type ResolvedOption = string | LabeledValue;

export interface UnresolvedParam {
	/** The param name (e.g. "env") */
	name: string;
	/** When the resolver returns an array, these are the options the user can pick from */
	options?: ResolvedOption[];
}

export interface ResolveRouteResult {
	/** The route with resolved params replaced (unresolved ones stay as `:param`) */
	path: string;
	/** Params that still need a value, optionally with selectable options */
	unresolved: UnresolvedParam[];
	/** Accumulated param values resolved so far (includes both auto-resolved and user-selected) */
	selections: Record< string, string >;
}

export interface Command {
	/** Unique identifier (also used for recency tracking) */
	id: string;

	/** Display title — primary search target */
	title: string;

	/** Optional description shown below the title */
	description?: string;

	/** Route with optional variables: "/apps/:id/logs" (mutually exclusive with action) */
	route?: string;

	/** Callback for non-route commands (mutually exclusive with route) */
	action?: () => void;

	/** Group label for visual sections: "Pages", "Actions" */
	group?: string;

	/** Additional search terms not shown in UI */
	keywords?: string[];

	/** Icon component or element */
	icon?: ReactNode;

	/** Keyboard shortcut hint shown in UI: "⌘L" */
	shortcut?: string;
}

export interface ParamSelectionState {
	/** The command currently being resolved */
	command: Command;
	/** The partially-resolved route path */
	path: string;
	/** Queue of params that still need a user selection */
	pending: UnresolvedParam[];
	/** Accumulated user selections so far (param name → selected value) */
	selections: Record< string, string >;
}

interface BaseCommandPaletteEvent {
	type: 'open' | 'execute' | 'resolve_error';
}

interface OpenCommandPaletteEvent extends BaseCommandPaletteEvent {
	type: 'open';
}

interface BaseCommandExecuteEvent extends BaseCommandPaletteEvent {
	type: 'execute';
	command: Command;
	commandType: 'route' | 'action';
}

interface CommandNavigationExecuteEvent extends BaseCommandExecuteEvent {
	commandType: 'route';
	path: string;
}

interface CommandActionExecuteEvent extends BaseCommandExecuteEvent {
	commandType: 'action';
}

interface CommandResolveErrorEvent extends BaseCommandPaletteEvent {
	type: 'resolve_error';
	command: Command;
	error: unknown;
}

export type CommandPaletteEvent =
	| OpenCommandPaletteEvent
	| CommandNavigationExecuteEvent
	| CommandActionExecuteEvent
	| CommandResolveErrorEvent;

/**
 * A resolved param is either a final string value or an array of options
 * for the user to choose from inside the palette. Each option can be a plain
 * string or a `{ label, value }` object so the palette shows human-readable
 * labels while substituting the underlying value into the route.
 */
export type ResolvedParam = string | ResolvedOption[];

export interface CommandsProps {
	/** Array of command definitions */
	commands: Command[];

	/**
	 * Resolves a single route variable at runtime.
	 * Called once per `:param` in left-to-right order. Receives the param name,
	 * a record of already-resolved values, and the current search text typed
	 * by the user (empty string on initial resolution).
	 *
	 * Return a string to auto-fill the param (the palette moves to the next
	 * param immediately). Return an array to show a sub-layer where the user
	 * picks one — each element can be a plain string or a `{ label, value }`
	 * object. The resolver is re-called with updated search text as the user
	 * types, enabling server-side filtering of large option sets.
	 */
	resolver?: (
		param: string,
		selections: Record< string, string >,
		search: string
	) => ResolvedParam | Promise< ResolvedParam >;

	/** Called when a route command is selected with the fully resolved path */
	onNavigate?: ( path: string ) => void;

	/** Called when the palette opens, a command executes, or route resolution fails */
	onEvent?: ( event: CommandPaletteEvent ) => void;

	/**
	 * Keyboard shortcut to open the palette. Default: `"Mod+k"`
	 * (Cmd on macOS, Ctrl elsewhere). Modifiers are joined with `+`, e.g.
	 * `"Meta+k"`, `"Ctrl+Shift+p"`.
	 */
	triggerKey?: string;

	/** Placeholder text for the search input. Default: `"Search commands..."` */
	placeholder?: string;

	/**
	 * Custom filter function. Return a score between 0 and 1 where 0 hides
	 * the item and 1 ranks it highest. If omitted, uses cmdk's built-in scoring.
	 */
	filter?: ( value: string, search: string ) => number;

	/** Custom empty state content shown when no commands match the search */
	emptyState?: ReactNode;

	/** Show recently selected commands when search is empty. Default: `true` */
	showRecent?: boolean;

	/** Maximum number of recent commands to display. Default: `5` */
	recentLimit?: number;

	/** localStorage key for recent commands. Default: `"@automattic/commands:recent"` */
	recentStorageKey?: string;
}

export interface CommandListContentProps {
	resolveError: string | null;
	paramSelection: ParamSelectionState | null;
	currentParam: UnresolvedParam | null;
	emptyState: CommandsProps[ 'emptyState' ];
	showRecent: boolean;
	recentCommands: Command[];
	grouped: Map< string, Command[] >;
	onSelect: ( item: Command ) => void;
	onParamOptionSelect: ( value: string ) => void;
}
