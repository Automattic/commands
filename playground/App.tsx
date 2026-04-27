import { Commands } from '@automattic/commands';

import type { Command, CommandsProps } from '@automattic/commands';

const commands: Command[] = [
	{
		id: 'home',
		title: 'Home',
		route: '/home',
		group: 'Pages',
		icon: '\u2302',
		keywords: [ 'dashboard', 'overview' ],
	},
	{
		id: 'settings',
		title: 'Settings',
		route: '/settings',
		group: 'Pages',
		icon: '\u2699',
		keywords: [ 'preferences', 'config' ],
	},
	{
		id: 'app-logs',
		title: 'Application logs',
		description: 'Resolver fills :appId from context',
		route: '/apps/:appId/logs',
		group: 'Pages',
		icon: '\ud83d\udcdd',
		keywords: [ 'logs', 'monitoring' ],
	},
	{
		id: 'audit-log',
		title: 'Audit log',
		description: 'Resolver fills :appId and :env from context',
		route: '/apps/:appId/:env/audit-log',
		group: 'Pages',
		icon: '\ud83d\udee1',
		keywords: [ 'audit', 'security' ],
	},
	{
		id: 'projects',
		title: 'Projects',
		action: () => console.log( 'Projects' ),
		group: 'Actions',
		icon: '\u2630',
	},
	{
		id: 'logout',
		title: 'Log out',
		action: () => console.log( 'Log out' ),
		group: 'Actions',
		icon: '\u21A6',
	},
];

/**
 * Sample resolver that simulates deriving route params from the current page.
 * In a real app this would read the URL, app state, or call an API.
 */
const resolver: CommandsProps[ 'resolver' ] = params => {
	console.log( 'Resolver called with', params );

	const resolved = { ...params };

	if ( 'appId' in resolved ) {
		resolved.appId = 'my-cool-app';
	}

	if ( 'env' in resolved ) {
		resolved.env = 'production';
	}

	return resolved;
};

export function App() {
	return (
		<div style={ { padding: 24, fontFamily: 'system-ui, sans-serif' } }>
			<h1>@automattic/commands playground</h1>
			<p>
				Press <kbd>Mod+k</kbd> to open the command palette.
			</p>
			<p style={ { fontSize: 14, color: '#666' } }>
				Try &ldquo;Application logs&rdquo; or &ldquo;Audit log&rdquo; to see route param resolution
				in action. Check the console for details.
			</p>
			<Commands
				commands={ commands }
				triggerKey="Mod+k"
				resolver={ resolver }
				onNavigate={ path => console.log( 'Navigating to', path ) }
			/>
		</div>
	);
}
