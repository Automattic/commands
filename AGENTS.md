# Agent instructions for `@automattic/commands`

## What this project is

`@automattic/commands` is a config-driven CMD+K command palette for React, built on top of [cmdk](https://cmdk.paco.me/). The planned public API lets a consumer pass a flat `Command[]` and get a themed palette with fuzzy search, route variable resolution, recently-used tracking, and zero CSS import.

The repo is currently a buildable, testable, publishable skeleton. `src/index.ts` is a one-line re-export of `Command` from cmdk. Planned work will replace it with the config-driven `<Commands>` wrapper.

## Stack

- **Language**: TypeScript, strict mode, `react-jsx` transform
- **UI**: React 18+ (peer dependency), [cmdk](https://www.npmjs.com/package/cmdk) (runtime dependency)
- **Bundler**: [tsup](https://tsup.egoist.dev/) — dual ESM/CJS + `.d.ts` output to `dist/`
- **Tests**: Vitest + React Testing Library, jsdom environment, tests co-located as `*.test.ts(x)`
- **Playground**: Vite, served from `playground/`
- **Lint**: ESLint 9 flat config via `@automattic/eslint-plugin-wpvip` (recommended preset)
- **Format**: `wp-prettier` (tabs, single quotes, spaces inside brackets)
- **Package manager**: **pnpm** (pinned via `packageManager: pnpm@10.14.0`). Do not use npm or yarn.
- **Node**: 24 from `.nvmrc`

## Setup

This repo pins Node 24 (`.nvmrc`) and pnpm 10.14.0 (`packageManager` in `package.json`).

1. Activate Node 24:
   - nvm: `nvm use`
   - fnm: `fnm use`
2. Make pnpm available via Corepack (once per Node version):
   - `corepack enable`
   - Corepack picks up `packageManager: pnpm@10.14.0` from `package.json` and fetches the right version on first use.
3. Install dependencies: `pnpm install`

## Commands

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `pnpm install`      | Install dependencies                                       |
| `pnpm build`        | Build ESM + CJS + types to `dist/` via tsup                |
| `pnpm dev`          | Start Vite playground with HMR against `src/` at `:5173`   |
| `pnpm dev:dist`     | Build with tsup, then serve the playground against `dist/` |
| `pnpm test`         | Run Vitest once                                            |
| `pnpm test:watch`   | Run Vitest in watch mode                                   |
| `pnpm lint`         | ESLint                                                     |
| `pnpm lint:fix`     | ESLint with `--fix`                                        |
| `pnpm format`       | Prettier `--write`                                         |
| `pnpm format:check` | Prettier `--check` (used by CI)                            |

## Repo layout

```
src/                   Library source and co-located tests
playground/
  vite.config.ts       Aliases @automattic/commands to src/ or dist/ via --mode
.nvmrc                 Pins Node 24
.prettierrc            Extends wp-prettier
eslint.config.js       ESLint 9 flat config
tsconfig.build.json    Library-only, used by tsup
tsconfig.json          IDE + ESLint, noEmit, wider include
tsup.config.ts         Bundler config, points at tsconfig.build.json
vitest.config.ts       Test runner config (jsdom)
vitest.setup.ts        jest-dom matchers + ResizeObserver shim
```

## Conventions and rules

- **Publishing surface is `src/index.ts`.** tsup follows that entry; anything not reachable from it does not ship.
- **Keep the two tsconfigs separate.** `tsconfig.build.json` is tsup-only; `tsconfig.json` is for IDE + ESLint with `noEmit`. Don't merge them.
- **Tests go next to source** as `*.test.ts(x)` and run in jsdom. `ResizeObserver` is shimmed in `vitest.setup.ts` because cmdk needs it.
- For everything else, let the lint preset and `pnpm format:check` tell you what to fix.

## Verify your changes

1. `pnpm lint` — clean
2. `pnpm format:check` — clean (use `pnpm format` to auto-fix)
3. `pnpm test` — passes
4. `pnpm build` — produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`
5. UI and playground changes can't be verified by `pnpm test`. Run `pnpm dev` and inspect in a browser, or flag that UI verification is pending.

## Commit and PR style

- Subject line: imperative, capitalized, ≤50 chars, no trailing period
- Body: explain **why** — what problem the change solves, what it replaces
- Keep commits atomic; split refactors from behavior changes
- PR description: Summary + What changed + Manual testing checklist
