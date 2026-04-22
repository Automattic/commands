/** @jsxRuntime automatic */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Command } from '@automattic/commands';

function App() {
	return (
		<div style={ { padding: 24, fontFamily: 'system-ui, sans-serif' } }>
			<h1>@automattic/commands playground</h1>
			<Command
				style={ {
					border: '1px solid #e2e2e2',
					borderRadius: 8,
					maxWidth: 480,
					padding: 8,
				} }
			>
				<Command.Input placeholder="Type a command..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Actions">
						<Command.Item onSelect={ () => console.log( 'New file' ) }>New File</Command.Item>
						<Command.Item onSelect={ () => console.log( 'Search' ) }>Search</Command.Item>
						<Command.Item onSelect={ () => console.log( 'Settings' ) }>Settings</Command.Item>
					</Command.Group>
				</Command.List>
			</Command>
		</div>
	);
}

createRoot( document.getElementById( 'root' )! ).render(
	<StrictMode>
		<App />
	</StrictMode>
);
