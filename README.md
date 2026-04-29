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

The palette opens with `Mod+k` by default, which maps to Command on macOS and Control elsewhere.

## Theming

The default theme is bundled with `<Commands />`; consumers do not need to import CSS separately. The theme uses `cmdk-*` attribute selectors and exposes `--cmdk-*` CSS custom properties for overrides.

Set variables on `:root` or any ancestor of the palette. Besides the “global” colors and radius below, the bundled theme supports tokens for the overlay and dialog layout, the search field (including focus), list and group headings, row geometry and selection state, icons, description and shortcut styling, and empty/loading text.

```css
:root {
	/* Surface */
	--cmdk-bg: #fff;
	--cmdk-text: #1e1e1e;
	--cmdk-border: #dcdcde;
	--cmdk-radius: 4px;
	--cmdk-shadow: 0 16px 40px rgba( 0, 0, 0, 0.12 );
	--cmdk-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--cmdk-max-height: 360px;

	/* Overlay & dialog */
	--cmdk-overlay-bg: rgba( 0, 0, 0, 0.45 );
	--cmdk-overlay-z: 999;
	--cmdk-dialog-top: 14vh;
	--cmdk-dialog-width: 640px;
	--cmdk-dialog-margin: 32px;
	--cmdk-dialog-border-width: 1px;
	--cmdk-dialog-z: 1000;

	/* Search */
	--cmdk-input-bg: #fff;
	--cmdk-input-text: #1e1e1e;
	--cmdk-placeholder: #757575;
	--cmdk-focus: #3858e9;

	/* Items */
	--cmdk-item-selected-bg: #f6f7f7;
	--cmdk-item-selected-text: #1e1e1e;
	--cmdk-item-selected-indicator: #3858e9;

	/* Secondary text */
	--cmdk-group-heading: #646970;
	--cmdk-description: #646970;
	--cmdk-type-label: #646970;
	--cmdk-shortcut: #646970;
}
```

Additional `--cmdk-*` variables tune spacing, typography, and motion (for example `--cmdk-input-height`, `--cmdk-item-padding-x`, `--cmdk-icon-size`, `--cmdk-shortcut-bg`, `--cmdk-transition-duration`, `--cmdk-empty-padding-y`, `--cmdk-loading-font-size`). Each has a default in the bundled stylesheet; override only what you need.

The default theme is WPDS-aware, meaning it can use WordPress Design System CSS variables when they are available, without taking a package dependency on WPDS. If those variables are not present, the theme falls back to neutral static values.

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
