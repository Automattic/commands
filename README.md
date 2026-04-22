# @automattic/commands

Command palette components for WordPress.com, powered by [cmdk](https://cmdk.paco.me/).

## Setup

```bash
nvm use
pnpm install
```

## Scripts

| Command           | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `pnpm build`      | Build ESM + CJS output to `dist/`                                          |
| `pnpm dev`        | Start the Vite playground with HMR against `src/` at `http://localhost:5173/` |
| `pnpm dev:dist`   | Build first, then start the playground against `dist/`                     |
| `pnpm test`       | Run tests (Vitest + React Testing Library)                                 |
| `pnpm test:watch` | Run tests in watch mode                                                    |
| `pnpm lint`       | Lint with ESLint                                                           |
| `pnpm lint:fix`   | Lint and auto-fix                                                          |
| `pnpm format`     | Format with Prettier                                                       |

## Usage

```tsx
import { Command } from '@automattic/commands';

function App() {
	return (
		<Command>
			<Command.Input placeholder="Search..." />
			<Command.List>
				<Command.Empty>No results</Command.Empty>
				<Command.Item>Item</Command.Item>
			</Command.List>
		</Command>
	);
}
```

### Peer Dependencies

This package requires `react` and `react-dom` >= 18 as peer dependencies.
