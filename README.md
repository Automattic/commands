# @automattic/commands

Config-driven command palette components for React, powered by [cmdk](https://cmdk.paco.me/).

## Install

```bash
npm install @automattic/commands
```

This package requires `react` and `react-dom` >= 18 as peer dependencies.

## Usage

```tsx
import { Commands } from '@automattic/commands';

import type { Command } from '@automattic/commands';

const commands: Command[] = [
	{
		id: 'dashboard',
		title: 'Dashboard',
		description: 'Go to dashboard',
		route: '/dashboard',
		group: 'Pages',
		keywords: [ 'home', 'overview' ],
	},
	{
		id: 'toggle-theme',
		title: 'Toggle Dark Mode',
		action: () => {
			document.documentElement.classList.toggle( 'is-dark' );
		},
		group: 'Actions',
		shortcut: 'D',
	},
];

export function App() {
	return (
		<Commands commands={ commands } onNavigate={ path => history.pushState( null, '', path ) } />
	);
}
```

The default theme is bundled with `<Commands />`; consumers do not need to import CSS separately. Customize the theme with CSS variables such as `--cmdk-bg`, `--cmdk-text`, `--cmdk-border`, and `--cmdk-item-selected-bg`.

## Development

```bash
nvm use
pnpm install
pnpm test
pnpm build
```

| Command             | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `pnpm build`        | Build ESM + CJS output to `dist/`                                             |
| `pnpm dev`          | Start the Vite playground with HMR against `src/` at `http://localhost:5173/` |
| `pnpm dev:dist`     | Build first, then start the playground against `dist/`                        |
| `pnpm test`         | Run tests with Vitest and React Testing Library                               |
| `pnpm test:watch`   | Run tests in watch mode                                                       |
| `pnpm lint`         | Lint with ESLint                                                              |
| `pnpm lint:fix`     | Lint and auto-fix                                                             |
| `pnpm format`       | Format with Prettier                                                          |
| `pnpm format:check` | Check formatting                                                              |

## License

Licensed under GPL-2.0-or-later. See [LICENSE](./LICENSE).
