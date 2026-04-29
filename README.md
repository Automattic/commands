# @automattic/commands

Config-driven CMD+K command palette for React, powered by [cmdk](https://cmdk.paco.me/).

Pass a flat `Command[]` array and get a themed palette with fuzzy search, route variable resolution, recently-used tracking, and zero CSS import.

## Install

```bash
npm install @automattic/commands
```

Peer dependencies: `react` and `react-dom` >= 18.

## Quick start

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

function App() {
	return <Commands commands={ commands } onNavigate={ path => router.push( path ) } />;
}
```

Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to open. The palette renders a dialog overlay, search input, and command list — no extra CSS import needed.

## API reference

### `Command`

Each entry in the `commands` array describes one palette item.

| Field         | Type         | Required | Description                                                                                                                 |
| ------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`     | Yes      | Unique identifier, also used for recency tracking.                                                                          |
| `title`       | `string`     | Yes      | Display title and primary search target.                                                                                    |
| `description` | `string`     | No       | Secondary line shown below the title.                                                                                       |
| `route`       | `string`     | No       | Navigation path. Supports `:param` variables (see [Resolver pattern](#resolver-pattern)). Mutually exclusive with `action`. |
| `action`      | `() => void` | No       | Callback for non-navigation commands. Mutually exclusive with `route`.                                                      |
| `group`       | `string`     | No       | Group label for visual sections (e.g. `"Pages"`, `"Actions"`).                                                              |
| `keywords`    | `string[]`   | No       | Extra search terms not displayed in the UI.                                                                                 |
| `icon`        | `ReactNode`  | No       | Icon element rendered before the title.                                                                                     |
| `shortcut`    | `string`     | No       | Keyboard shortcut hint shown on the right (e.g. `"⌘L"`). Display-only — does not register a listener.                       |

Every command must have either `route` or `action` (but not both). In development, invalid commands produce `console.warn` messages.

### `CommandsProps`

Props for the `<Commands />` component.

| Prop               | Type                                                                | Default                         | Description                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `commands`         | `Command[]`                                                         | —                               | Array of command definitions.                                                                                                                   |
| `resolver`         | `(params: string[]) => Record<string, ResolvedParam> \| Promise<…>` | —                               | Resolves route `:param` variables at runtime. See [Resolver pattern](#resolver-pattern).                                                        |
| `onNavigate`       | `(path: string) => void`                                            | —                               | Called with the fully resolved path when a route command is selected.                                                                           |
| `triggerKey`       | `string`                                                            | `"Mod+k"`                       | Keyboard shortcut to toggle the palette. `Mod` maps to Cmd on macOS, Ctrl elsewhere. Modifiers are `+`-separated: `"Meta+k"`, `"Ctrl+Shift+p"`. |
| `placeholder`      | `string`                                                            | `"Search commands..."`          | Placeholder text for the search input.                                                                                                          |
| `filter`           | `(value: string, search: string) => number`                         | cmdk built-in                   | Custom scoring function. Return 0 to hide, 1 to rank highest.                                                                                   |
| `emptyState`       | `ReactNode`                                                         | `"No results found."`           | Content shown when no commands match the search.                                                                                                |
| `showRecent`       | `boolean`                                                           | `true`                          | Show recently selected commands when the search input is empty.                                                                                 |
| `recentLimit`      | `number`                                                            | `5`                             | Maximum number of recent commands to display.                                                                                                   |
| `recentStorageKey` | `string`                                                            | `"@automattic/commands:recent"` | `localStorage` key for persisting recent commands.                                                                                              |

### Utility exports

The package also exports route-resolution helpers:

```ts
import { resolveRoute, extractParams, replaceRouteParam } from '@automattic/commands';
```

| Function            | Signature                                                   | Description                                                                                                         |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `extractParams`     | `(route: string) => string[]`                               | Extracts `:param` names from a route. `"/apps/:id/logs"` → `["id"]`.                                                |
| `replaceRouteParam` | `(route: string, name: string, value: string) => string`    | Replaces a single named parameter in a route string.                                                                |
| `resolveRoute`      | `(route: string, resolver?) => Promise<ResolveRouteResult>` | Runs the full resolution pipeline: extract params → call resolver → return resolved path and any unresolved params. |

### Types

```ts
import type {
	Command,
	CommandsProps,
	ResolvedParam,
	ResolveRouteResult,
	UnresolvedParam,
} from '@automattic/commands';
```

**`ResolvedParam`** — `string | string[]`. A string means the param is fully resolved; an array means the palette shows a sub-layer for the user to pick one.

**`ResolveRouteResult`** — `{ path: string; unresolved: UnresolvedParam[] }`. The path with resolved params replaced; unresolved params listed with optional selectable options.

**`UnresolvedParam`** — `{ name: string; options?: string[] }`. A param that still needs a value, optionally with options for the user to choose from.

## Resolver pattern

Routes can contain `:param` placeholders that are resolved at runtime via the `resolver` prop. This lets you inject dynamic context (current app ID, environment, user) without baking it into command definitions.

### How it works

1. User selects a command with a parameterized route (e.g. `/apps/:appId/:env/logs`).
2. The palette calls `resolver(["appId", "env"])`.
3. For each param, the resolver returns:
   - A **string** → the param is replaced in the path immediately.
   - A **string array** → the palette shows a sub-layer where the user picks one option.
   - **Nothing** (key omitted) → the param is listed as unresolved with no options.
4. Once all params are resolved, `onNavigate` fires with the final path.

### Example: static and dynamic params

```tsx
const resolver = async params => {
	const result = {};

	// Static: always resolve appId from context
	if ( params.includes( 'appId' ) ) {
		result.appId = currentApp.id; // string → replaced immediately
	}

	// Dynamic: fetch environment options from an API
	if ( params.includes( 'env' ) ) {
		const envs = await fetchEnvironments();
		result.env = envs.map( e => e.name ); // string[] → user picks one
	}

	return result;
};

<Commands
	commands={ [ { id: 'logs', title: 'App logs', route: '/apps/:appId/:env/logs' } ] }
	resolver={ resolver }
	onNavigate={ path => router.push( path ) }
/>;
```

When the user selects "App logs":

1. The palette shows a loading state while the resolver runs.
2. `:appId` is replaced immediately (e.g. `/apps/my-app/:env/logs`).
3. A sub-layer appears listing the environment options. The user picks one.
4. `onNavigate` fires with `/apps/my-app/production/logs`.

### Resolver tips

- The resolver can be sync or async. Async resolvers trigger a loading state in the palette.
- If the resolver throws, the error is logged and the palette resets — no navigation occurs.
- Multiple params are resolved in a single `resolver()` call, not one call per param.
- Press **Backspace** on an empty input during param selection to cancel and return to the command list.

## Theming

The default theme is bundled with `<Commands />` — no CSS import needed. Override any value by setting `--cmdk-*` custom properties on `:root` or any ancestor of the palette.

### CSS custom properties

#### Surface

| Variable            | Default                                                                                    | Description                                 |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `--cmdk-bg`         | `#fff`                                                                                     | Dialog background.                          |
| `--cmdk-text`       | `#1e1e1e`                                                                                  | Primary text color.                         |
| `--cmdk-border`     | `#dcdcde`                                                                                  | Border color (dialog and input divider).    |
| `--cmdk-radius`     | `4px`                                                                                      | Dialog border radius.                       |
| `--cmdk-shadow`     | `0 16px 40px rgba(0,0,0,0.12)`                                                             | Dialog box shadow.                          |
| `--cmdk-font`       | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif` | Font stack.                                 |
| `--cmdk-max-height` | `360px`                                                                                    | Max height for the scrollable command list. |

#### Overlay and dialog

| Variable                     | Default            | Description                            |
| ---------------------------- | ------------------ | -------------------------------------- |
| `--cmdk-overlay-bg`          | `rgba(0,0,0,0.45)` | Overlay backdrop color.                |
| `--cmdk-overlay-z`           | `999`              | Overlay z-index.                       |
| `--cmdk-dialog-top`          | `14vh`             | Vertical position from top.            |
| `--cmdk-dialog-width`        | `640px`            | Max dialog width.                      |
| `--cmdk-dialog-margin`       | `32px`             | Viewport safety margin.                |
| `--cmdk-dialog-border-width` | `1px`              | Dialog and input divider border width. |
| `--cmdk-dialog-z`            | `1000`             | Dialog z-index.                        |

#### Search input

| Variable                    | Default                            | Description                                      |
| --------------------------- | ---------------------------------- | ------------------------------------------------ |
| `--cmdk-input-height`       | `52px`                             | Minimum height of the input row.                 |
| `--cmdk-input-padding-x`    | `16px`                             | Horizontal padding of the input row.             |
| `--cmdk-input-bg`           | `#fff`                             | Input background.                                |
| `--cmdk-input-text`         | `#1e1e1e`                          | Input text color.                                |
| `--cmdk-input-font-size`    | `16px`                             | Input font size.                                 |
| `--cmdk-input-line-height`  | `24px`                             | Input line height.                               |
| `--cmdk-input-icon-size`    | `18px`                             | Search icon size.                                |
| `--cmdk-input-icon-gap`     | `12px`                             | Gap between search icon and input.               |
| `--cmdk-placeholder`        | `#757575`                          | Placeholder and empty/loading text color.        |
| `--cmdk-focus`              | `#3858e9`                          | Focus accent (input border, selected indicator). |
| `--cmdk-input-focus-shadow` | `inset 0 -1px 0 var(--cmdk-focus)` | Box shadow when input is focused.                |

#### List

| Variable              | Default | Description                              |
| --------------------- | ------- | ---------------------------------------- |
| `--cmdk-list-padding` | `4px`   | Padding inside the scrollable list area. |

#### Group headings

| Variable                           | Default   | Description                 |
| ---------------------------------- | --------- | --------------------------- |
| `--cmdk-group-heading`             | `#646970` | Heading text color.         |
| `--cmdk-group-heading-font-size`   | `12px`    | Heading font size.          |
| `--cmdk-group-heading-line-height` | `16px`    | Heading line height.        |
| `--cmdk-group-heading-padding-y`   | `8px`     | Heading vertical padding.   |
| `--cmdk-group-heading-padding-x`   | `12px`    | Heading horizontal padding. |
| `--cmdk-group-heading-font-weight` | `500`     | Heading font weight.        |

#### Items

| Variable                         | Default   | Description                              |
| -------------------------------- | --------- | ---------------------------------------- |
| `--cmdk-item-padding-y`          | `10px`    | Item vertical padding.                   |
| `--cmdk-item-padding-x`          | `12px`    | Item horizontal padding.                 |
| `--cmdk-item-radius`             | `4px`     | Item border radius.                      |
| `--cmdk-item-font-size`          | `14px`    | Item font size.                          |
| `--cmdk-item-line-height`        | `20px`    | Item line height.                        |
| `--cmdk-item-gap`                | `12px`    | Gap between icon, content, and shortcut. |
| `--cmdk-item-title-font-weight`  | `500`     | Title font weight.                       |
| `--cmdk-item-selected-bg`        | `#f6f7f7` | Selected item background.                |
| `--cmdk-item-selected-text`      | `#1e1e1e` | Selected item text color.                |
| `--cmdk-item-selected-indicator` | `#3858e9` | Left border accent on selected item.     |
| `--cmdk-transition-duration`     | `100ms`   | Hover/selection transition duration.     |
| `--cmdk-disabled-opacity`        | `0.5`     | Opacity for disabled items.              |

#### Icons

| Variable            | Default   | Description            |
| ------------------- | --------- | ---------------------- |
| `--cmdk-icon-size`  | `20px`    | Icon width and height. |
| `--cmdk-icon-color` | `#646970` | Icon color.            |

#### Description

| Variable                              | Default   | Description                        |
| ------------------------------------- | --------- | ---------------------------------- |
| `--cmdk-description`                  | `#646970` | Description text color.            |
| `--cmdk-item-description-font-size`   | `12px`    | Description font size.             |
| `--cmdk-item-description-line-height` | `16px`    | Description line height.           |
| `--cmdk-item-description-gap`         | `2px`     | Gap between title and description. |

#### Shortcut badge and type label

| Variable                       | Default                    | Description                              |
| ------------------------------ | -------------------------- | ---------------------------------------- |
| `--cmdk-shortcut`              | `#646970`                  | Shortcut text color (fallback).          |
| `--cmdk-shortcut-text`         | inherits `--cmdk-shortcut` | Shortcut text color.                     |
| `--cmdk-shortcut-bg`           | `#f6f7f7`                  | Shortcut badge background.               |
| `--cmdk-shortcut-border`       | `#dcdcde`                  | Shortcut badge border color.             |
| `--cmdk-shortcut-border-width` | `1px`                      | Shortcut badge border width.             |
| `--cmdk-shortcut-radius`       | `4px`                      | Shortcut badge border radius.            |
| `--cmdk-shortcut-padding-y`    | `2px`                      | Shortcut badge vertical padding.         |
| `--cmdk-shortcut-padding-x`    | `6px`                      | Shortcut badge horizontal padding.       |
| `--cmdk-type-label`            | `#646970`                  | Type label color ("Link" / "Action").    |
| `--cmdk-item-meta-font-size`   | `12px`                     | Font size for shortcut and type label.   |
| `--cmdk-item-meta-line-height` | `16px`                     | Line height for shortcut and type label. |

#### Empty and loading states

| Variable                     | Default | Description                       |
| ---------------------------- | ------- | --------------------------------- |
| `--cmdk-empty-padding-y`     | `32px`  | Empty state vertical padding.     |
| `--cmdk-empty-padding-x`     | `16px`  | Empty state horizontal padding.   |
| `--cmdk-empty-font-size`     | `14px`  | Empty state font size.            |
| `--cmdk-empty-line-height`   | `20px`  | Empty state line height.          |
| `--cmdk-loading-padding-y`   | `24px`  | Loading state vertical padding.   |
| `--cmdk-loading-padding-x`   | `16px`  | Loading state horizontal padding. |
| `--cmdk-loading-font-size`   | `14px`  | Loading state font size.          |
| `--cmdk-loading-line-height` | `20px`  | Loading state line height.        |

### Dark mode example

```css
.dark-theme {
	--cmdk-bg: #1e1e1e;
	--cmdk-text: #f0f0f0;
	--cmdk-border: #3c3c3c;
	--cmdk-shadow: 0 16px 40px rgba( 0, 0, 0, 0.4 );
	--cmdk-overlay-bg: rgba( 0, 0, 0, 0.7 );
	--cmdk-input-bg: #1e1e1e;
	--cmdk-input-text: #f0f0f0;
	--cmdk-placeholder: #a0a0a0;
	--cmdk-item-selected-bg: #2c2c2c;
	--cmdk-item-selected-text: #f0f0f0;
	--cmdk-group-heading: #a0a0a0;
	--cmdk-description: #a0a0a0;
	--cmdk-shortcut-bg: #2c2c2c;
	--cmdk-shortcut-border: #3c3c3c;
}
```

### WPDS integration

The theme is WPDS-aware: when WordPress Design System CSS variables (e.g. `--wpds-color-bg-surface-neutral`) are present, the palette uses them automatically. No WPDS package dependency is required. When WPDS variables are absent, the static defaults above apply.

## Recently-used commands

When `showRecent` is `true` (the default), the palette tracks which commands the user selects and shows them in a "Recently Used" group at the top when the search input is empty.

- Recent entries are stored in `localStorage` under the key set by `recentStorageKey` (default: `"@automattic/commands:recent"`).
- Up to `recentLimit` entries are shown (default: `5`).
- Stale entries (commands whose `id` no longer exists in the `commands` array) are silently filtered out on read.
- Storage failures (SSR, private browsing, disabled storage, quota exceeded) are swallowed — the hook degrades to an in-memory list for the session.
- To disable, set `showRecent={ false }`.
- To use separate recent lists per context, pass different `recentStorageKey` values.

## Troubleshooting

### The palette doesn't open

- Verify the `triggerKey` matches what you expect. The default `"Mod+k"` maps to Cmd+K on macOS, Ctrl+K elsewhere.
- Check that no other listener is calling `event.preventDefault()` on the same key combo before it reaches the palette.
- Make sure `<Commands />` is mounted in the component tree.

### Route commands don't navigate

- Confirm you passed `onNavigate`. Without it, resolved paths are silently discarded.
- If the route has `:param` variables, make sure you also pass a `resolver`. Without one, params are listed as unresolved with no options.

### Resolver errors

- If the resolver throws or rejects, the error is logged to `console.error` and the palette resets. Check the console for `[@automattic/commands] Route resolution failed:`.
- The resolver receives all param names in a single call. Make sure it returns a value for each param you want resolved.

### "Command has an empty or missing id" warning

- In development, commands are validated on mount. Each command must have a non-empty `id` and `title`, and exactly one of `route` or `action`.
- Duplicate `id` values also trigger a warning. Validation is skipped in production.

### Recent commands not persisting

- `localStorage` must be available. In SSR or private browsing, the hook falls back to in-memory state.
- Check that you're not passing a different `recentStorageKey` across renders.

### CSS overrides not applying

- Custom properties must be set on an ancestor of the dialog, or on `:root`. The palette renders via a portal, so scoped parent styles won't reach it — use `:root` or `body`.
- Ensure your overrides load after the bundled stylesheet if specificity is equal.

### ResizeObserver errors in tests

- cmdk requires `ResizeObserver`. In jsdom, shim it before importing the component:

```ts
global.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
```

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
