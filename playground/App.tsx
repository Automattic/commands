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
		action: () => {
			/* handled via onAction state in App */
		},
		group: 'Home',
		icon: '\u2630',
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
		action: () => {
			/* handled via onAction state in App */
		},
		group: 'Other',
		icon: '\u21A6',
	},
];

/**
 * Sample async resolver that resolves params one by one.
 * The `env` options change based on which `appId` the user selects,
 * because `selections` carries the previously-picked values.
 *
 * Selecting "non-existent-app" demonstrates the error path —
 * the resolver throws and the palette resets to the command list.
 */
const envsByApp: Record< string, string[] > = {
	'my-cool-app': [ 'production', 'staging' ],
	'my-other-app': [ 'production', 'staging', 'development' ],
};

const resolver: CommandsProps[ 'resolver' ] = async ( { param, selections } ) => {
	if ( param === 'appId' ) {
		return [
			{
				label: 'My cool app',
				value: 'my-cool-app',
				description: 'apps.example.com/my-cool-app',
				icon: '\ud83d\ude80',
				keywords: [ 'primary', 'flagship' ],
			},
			{
				label: 'My other app',
				value: 'my-other-app',
				description: 'apps.example.com/my-other-app',
				icon: '\ud83e\uddea',
			},
			{
				label: 'Non-existent app (will error)',
				value: 'non-existent-app',
				icon: '\u26a0\ufe0f',
			},
		];
	}

	if ( param === 'env' ) {
		await new Promise( resolve => setTimeout( resolve, 800 ) );
		const envs = envsByApp[ selections.appId ];
		if ( ! envs ) {
			throw new Error( 'Cannot load env' );
		}
		return envs;
	}

	return [];
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
				Try &ldquo;Audit log&rdquo; to see the input spinner during loading, the param-selection
				sub-layer with icons and descriptions, and the breadcrumb at the top of the palette as you
				drill down.
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
