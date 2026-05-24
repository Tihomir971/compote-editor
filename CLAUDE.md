# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`compote-editor` is a Svelte 5 library that provides a rich document editor with live pagination and print support. It is built on TipTap v3 (ProseMirror-based) and uses Paged.js for professional print layout.

## Package Manager

Uses **bun** (not npm). Always use `bun` for installs and script execution.

## Commands

```bash
bun run dev          # Start dev server (demo app at localhost)
bun run build        # Build library (vite build + prepack)
bun run check        # svelte-check + TypeScript — run before committing
bun run lint         # Prettier check + ESLint — run after check
bun run format       # Auto-format with Prettier
```

Run `bun run check` then `bun run lint` before committing. The dev app (`src/routes/`) is the primary testing surface — there is no automated test suite.

## Code Style

Enforced by Prettier (`.prettierrc`):

- **Tabs** for indentation (not spaces)
- **Single quotes** for strings
- **100 character** line width
- **No trailing commas**
- Tailwind class ordering via `prettier-plugin-tailwindcss`

**Prefer Tailwind CSS over raw CSS** wherever possible. Use `cn()` from `compote-ui` for conditional class merging. UI components (Button, Dialog, ScrollArea, ToggleGroup, etc.) come from `compote-ui`.

## Svelte 5

All source files use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`). Runes mode is forced for non-`node_modules` in `svelte.config.js` — do not use legacy reactive declarations (`$:`, `export let`).

## TipTap / Editor Conventions

- **Content is HTML, not JSON** — the editor serializes via `editor.getHTML()` and hydrates from an HTML string. Do not use ProseMirror JSON.
- **Toolbar auto-detects extensions** — buttons only render when their corresponding TipTap extension is loaded. `TextAlign` requires `.configure({ types: ['heading', 'paragraph'] })`.
- **DocumentPagination** is the custom live-pagination extension (replaces the vendored `PaginationPlus`). It uses CSS variables (`--cdp-page-width`, `--cdp-page-height`, `--cdp-page-margin-*`, `--cdp-page-gap`) for theming. The consumer must provide `--color-surface-2` (from compote-ui theme) for the page gap background.

## Print / Paged.js

- `printWithPagedJs()` and `buildPagedJsHtml()` are **browser-only** — they access the DOM directly and will throw in SSR contexts.
- Paged.js is bundled as a Vite virtual module (`virtual:pagedjs-polyfill`) to avoid CORS issues.
- Noto Sans fonts are embedded as Base64 in `src/lib/print/embedded-fonts.ts` for self-contained print output.

## Library Structure

- `src/lib/` — all exported library code
- `src/lib/index.ts` — public API surface; only add exports here intentionally
- `src/routes/` — demo app for manual testing (not part of the published package)
