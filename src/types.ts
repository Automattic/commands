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
	action?: () => void | Promise< void >;

	/** Group label for visual sections: "Pages", "Actions" */
	group?: string;

	/** Additional search terms not shown in UI */
	keywords?: string[];

	/** Icon component or element */
	icon?: React.ReactNode;

	/** Keyboard shortcut hint shown in UI: "⌘L" */
	shortcut?: string;
}
