import { Commands } from '@automattic/commands';

const mockCommands = [
	{ id: 'test', title: 'Test', route: '/test' },
	{ id: 'test2', title: 'Test 2', route: '/test2' },
	{ id: 'test3', title: 'Test 3', route: '/test3' },
];

export function App() {
	return (
		<div style={ { padding: 24, fontFamily: 'system-ui, sans-serif' } }>
			<h1>@automattic/commands playground</h1>
			<Commands commands={ mockCommands } />
		</div>
	);
}
