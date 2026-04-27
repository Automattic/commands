import { useState } from 'react';

import { Commands } from '@automattic/commands';

import type { Command, CommandsProps } from '@automattic/commands';

interface Activity {
	type: 'navigation' | 'action';
	label: string;
	timestamp: string;
}

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
		description: 'Asks you to pick an environment',
		route: '/apps/:appId/:env/audit-log',
		group: 'Pages',
		icon: '\ud83d\udee1',
		keywords: [ 'audit', 'security' ],
	},
	{
		id: 'projects',
		title: 'Projects',
		action: () => {
			/* handled via onAction state in App */
		},
		group: 'Actions',
		icon: '\u2630',
	},
	{
		id: 'logout',
		title: 'Log out',
		action: () => {
			/* handled via onAction state in App */
		},
		group: 'Actions',
		icon: '\u21A6',
	},
];

/**
 * Sample async resolver that simulates an API call to fetch environment
 * options. The 800ms delay lets you see the "Resolving…" loading state
 * in the palette before the sub-layer appears.
 */
const resolver: CommandsProps[ 'resolver' ] = async params => {
	const resolved: Record< string, string | string[] > = { ...params };

	if ( 'appId' in resolved ) {
		resolved.appId = 'my-cool-app';
	}

	if ( 'env' in resolved ) {
		await new Promise( resolve => setTimeout( resolve, 800 ) );
		resolved.env = [ 'production', 'staging', 'development' ];
	}

	return resolved;
};

export function App() {
	const [ activities, setActivities ] = useState< Activity[] >( [] );

	const addActivity = ( type: Activity[ 'type' ], label: string ) => {
		setActivities( prev => [
			{ type, label, timestamp: new Date().toLocaleTimeString() },
			...prev,
		] );
	};

	const handleAction = ( command: Command ) => {
		addActivity( 'action', command.title );
	};

	return (
		<div style={ { padding: 24, fontFamily: 'system-ui, sans-serif' } }>
			<h1>@automattic/commands playground</h1>
			<p>
				Press <kbd>Mod+k</kbd> to open the command palette.
			</p>
			<p style={ { fontSize: 14, color: '#666' } }>
				Try &ldquo;Audit log&rdquo; to see the loading state followed by the param-selection
				sub-layer.
			</p>
			<Commands
				commands={ commands.map( command => ( {
					...command,
					action: command.action ? () => handleAction( command ) : undefined,
				} ) ) }
				triggerKey="Mod+k"
				resolver={ resolver }
				onNavigate={ path => addActivity( 'navigation', path ) }
			/>
			{ activities.length > 0 && (
				<div style={ { marginTop: 24 } }>
					<h2>Activities</h2>
					<ul style={ { listStyle: 'none', padding: 0, margin: 0 } }>
						{ activities.map( ( activity, idx ) => (
							<li
								key={ idx }
								style={ {
									padding: '6px 0',
									borderBottom: '1px solid #eee',
									fontFamily: 'monospace',
									fontSize: 14,
								} }
							>
								<span style={ { color: '#888' } }>{ activity.timestamp }</span>{ ' ' }
								<strong>{ activity.type === 'navigation' ? 'Navigation' : 'Action' }</strong>
								{ ' \u2014 ' }
								{ activity.label }
							</li>
						) ) }
					</ul>
				</div>
			) }
		</div>
	);
}
