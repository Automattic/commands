import { Commands } from '@automattic/commands';

import type { Command } from '@automattic/commands';

const commands: Command[] = [
	{
		id: 'home',
		title: 'Home',
		route: '/home',
		group: 'Home',
		icon: '\u2302',
		keywords: [ 'dashboard', 'overview' ],
	},
	{
		id: 'settings',
		title: 'Settings',
		route: '/settings',
		group: 'Home',
		icon: '\u2699',
		keywords: [ 'preferences', 'config' ],
	},
	{
		id: 'projects',
		title: 'Projects',
		action: () => console.log( 'Projects' ),
		group: 'Home',
		icon: '\u2630',
	},
	{
		id: 'developer-settings',
		title: 'Developer settings',
		route: '/developer-settings',
		group: 'Other',
		icon: '</>',
		keywords: [ 'api', 'tokens' ],
	},
	{
		id: 'privacy-policy',
		title: 'Privacy policy',
		route: '/privacy-policy',
		group: 'Other',
		icon: '\u2295',
	},
	{
		id: 'logout',
		title: 'Log out',
		action: () => console.log( 'Log out' ),
		group: 'Other',
		icon: '\u21A6',
	},
];

export function App() {
	return (
		<div style={ { padding: 24, fontFamily: 'system-ui, sans-serif' } }>
			<h1>@automattic/commands playground</h1>
			<p>
				Press <kbd>Mod+k</kbd> to open the command palette.
			</p>
			<Commands
				commands={ commands }
				triggerKey="Mod+k"
				onNavigate={ path => console.log( 'Navigating to', path ) }
			/>
		</div>
	);
}
