# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`react-native-annotate` — a pure-JS React Native library that overlays a visual annotation tool on top of any app in dev builds. Users tap a floating ✎ button, tap a component, leave a note, and copy a markdown report (component name + `file:line:column` + note) for pasting into an AI coding agent.

The published library is a **pure JS, dev-only** package — no native module, no Codegen, no config plugin. It works on both Paper and Fabric.

## Repo layout

Yarn workspaces monorepo:

- Library package: repo root (`src/` → built to `lib/` by `react-native-builder-bob`).
- Example app: `example/` (Expo SDK 55, consumes the library via workspace link).

Node version is pinned in `.nvmrc` (currently v24.13.0). Package manager is yarn 4 (Berry, `node-modules` linker via `.yarnrc.yml`) — **do not use npm**, the workspaces and resolutions won't work.

## Commands

From the repo root:

| Command | Purpose |
| --- | --- |
| `yarn` | Install all workspace deps. |
| `yarn typecheck` | `tsc` against `tsconfig.json`. |
| `yarn lint` | ESLint over `**/*.{js,ts,tsx}`. Append `--fix` to auto-format. |
| `yarn prepare` | `bob build` — emits `lib/module` (ESM) and `lib/typescript` (`.d.ts`). Runs automatically on install. |
| `yarn clean` | Delete `lib/`. |
| `yarn example start` | Start Metro for the example app. |
| `yarn example ios` / `android` / `web` | Run example on each platform. |
| `yarn example build:ios` / `build:android` / `build:web` | Native/web builds of the example. |

There is **no test runner** configured in this repo — `yarn test` does not exist. Manual verification is done in the example app.

## Architecture

### Entry points (`src/index.tsx`)

Exports `AnnotationProvider`, `useAnnotations`, `formatAnnotationsAsMarkdown`, and the `Annotation` / `ComponentInfo` / `AnnotationContextValue` types. Nothing else is part of the public API.

### The `__DEV__` gate (`src/AnnotationProvider.tsx`)

`AnnotationProvider` checks `enabled ?? __DEV__`. If false it returns `<>{children}</>` immediately — no context, no state, no overlay components mounted. This is intentional: in production bundles, the entire annotation implementation is dead code that the bundler can tree-shake. When changing behavior, preserve this — never do work above the `shouldRun` check.

### State flow

`AnnotationProviderImpl` is the orchestrator. The interaction is a small state machine:

1. **Idle** — `FloatingToggle` visible, nothing else active.
2. **Annotation mode** — toggle pressed → `TouchInterceptor` mounts a full-screen absolute-positioned overlay that captures the next tap.
3. **Pending tap** — tap location captured, `findComponentAtPoint` resolves the component via the inspector, `NotePrompt` opens.
4. **Saved** — note text + position + component metadata appended to `annotations[]`; an `AnnotationMarker` renders at `(x, y)`.
5. **Review** — drawer (`AnnotationDrawer`) lists annotations, supports remove/clear/copy-as-markdown.

The root `<View ref={rootRef} collapsable={false}>` is critical: `collapsable={false}` keeps the native view alive on Android so `findNodeHandle` returns a valid root tag for the inspector call.

### Component identification (`src/findComponentAtPoint.ts`)

Calls `UIManager.getInspectorDataForViewAtPoint(rootTag, x, y, callback)` — React Native's own dev-inspector API. The returned `source` field comes from JSX `__source` metadata that Babel injects in dev builds (`@babel/plugin-transform-react-jsx-source`). That's why source info **only exists in dev** — it isn't a policy choice, it's a consequence of the metadata pipeline. Production bundles strip `__source`, so even with `enabled={true}` in release builds, most components will resolve to `Unknown` with no file/line.

The API is wrapped defensively — if `getInspectorDataForViewAtPoint` is missing (older RN, web, etc.) the function returns `null` and annotations save without component info.

### Clipboard backend (`src/clipboard.ts`)

`copyToClipboard` uses dynamic `require` (not `import`) to try `expo-clipboard` first, then `@react-native-clipboard/clipboard`. Both are **optional peer deps** — the dynamic require is what keeps them truly optional: if neither is installed the bundler doesn't fail at build time; you only get a thrown `Error` if a user actually tries to copy. When adding clipboard logic, keep this pattern — don't convert to static imports.

### Markdown formatter (`src/formatMarkdown.ts`)

`relativizePath` trims absolute filesystem paths down to something readable (looks for `/src/`, `/app/`, `/components/`, `/screens/` markers, falls back to the last 4 path segments). This is heuristic, not configurable.

## Build pipeline

`yarn prepare` runs `react-native-builder-bob` per the `react-native-builder-bob` block in `package.json`:

- Source: `src/`
- Targets: `module` (ESM) and `typescript` (`.d.ts` via `tsconfig.build.json`)
- Output: `lib/`

`package.json` `exports` map points the package's `.` export to `src/index.tsx` for `source`, `lib/typescript/src/index.d.ts` for `types`, and `lib/module/index.js` for the default runtime — so source files are shipped for tooling that wants them, but consumers get the compiled JS at runtime.

## Example app constraints

`example/` uses **Expo SDK 55** (`expo: ~55.0.25`, `react-native: 0.83.6`, `react: 19.2.0`). Per `example/AGENTS.md`, when writing code that runs inside the example, consult the exact versioned Expo docs at `https://docs.expo.dev/versions/v55.0.0/` rather than relying on general Expo knowledge — Expo APIs change meaningfully across SDK versions.
