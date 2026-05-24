# Repository Guidelines

## Project Structure & Module Organization

This is a Svelte 5 library for TipTap v3 document editing, live pagination, and Paged.js printing.

- `src/lib/index.ts` defines the public package exports.
- `src/lib/components/` contains UI components such as `DocumentEditor.svelte` and `Toolbar.svelte`.
- `src/lib/extensions/` contains custom TipTap extensions and pagination.
- `src/lib/print/` contains printable HTML generation, page formats, typography CSS, embedded fonts, and the bundled Paged.js polyfill.
- `src/routes/` is the local demo app used during development.
- `scripts/` contains maintenance scripts.
- `dist/` and `.svelte-kit/` are generated outputs; do not hand-edit them.

## Build, Test, and Development Commands

- `bun run dev` starts the Vite/SvelteKit demo app.
- `bun run check` runs `svelte-kit sync` and `svelte-check`.
- `bun run lint` runs Prettier in check mode and ESLint.
- `bun run format` formats the repository with Prettier.
- `bun run build` syncs the polyfill, builds the demo, packages the library, and runs `publint`.
- `bun run sync:pagedjs-polyfill` refreshes `src/lib/print/paged.polyfill.txt`.

## Coding Style & Naming Conventions

Prettier is authoritative: tabs, single quotes, no trailing commas, and 100-column print width. Svelte files use the Svelte parser, with Tailwind class ordering from `src/routes/layout.css`.

Use PascalCase for Svelte components and exported TipTap extensions, for example `DocumentEditor.svelte` and `PageBreak`.

Prefer Svelte 5 runes syntax in components. Keep public exports centralized in `src/lib/index.ts`.

## Testing Guidelines

There is no dedicated unit test suite yet. Before handing off changes, run:

```bash
bun run check
bun run lint
```

For package API changes, also run `bun run build`. When changing editor behavior, update the demo in `src/routes/+page.svelte` to exercise the affected toolbar command or print/save flow.

## Commit & Pull Request Guidelines

Recent commits use short summaries, sometimes version-only release commits, for example `Update extensions for TipTap v3 StarterKit changes` and `0.1.0`. Keep subjects concise and focused.

Pull requests should include a clear description, linked issues, validation commands, and screenshots for toolbar, pagination, or print UI changes. Note package export or dependency changes explicitly.

## Agent-Specific Instructions

Do not hand-edit generated output. Change source under `src/lib/`, then run checks and build when distribution output needs regeneration. Preserve the library boundary: editor UI belongs here, while persistence stays in consumer callbacks such as `onSave`.

`rg` is not available in the default PowerShell environment for this repository. Use PowerShell-native search instead, for example:

```powershell
Get-ChildItem -Path src,.claude,scripts -Recurse -File | Select-String -Pattern "onPrint"
```
