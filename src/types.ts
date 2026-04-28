import type { ReactNode } from 'react';

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

/**
 * A resolved param is either a final string value or an array of options
 * for the user to choose from inside the palette.
 */
export type ResolvedParam = string | string[];

export interface CommandsProps {
	/** Array of command definitions */
	commands: Command[];

	/**
	 * Resolves route variables at runtime.
	 * Receives param names (e.g., `["id", "env"]`) and returns resolved values.
	 * A string value means the param is resolved. An array of strings means the
	 * palette will show a sub-layer for the user to pick one.
	 * May be async — the palette shows a loading state while resolving.
	 */
	resolver?: (
		params: string[]
	) => Record< string, ResolvedParam > | Promise< Record< string, ResolvedParam > >;

	/** Called when a route command is selected with the fully resolved path */
	onNavigate?: ( path: string ) => void;

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
