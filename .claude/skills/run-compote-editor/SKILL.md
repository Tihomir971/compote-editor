---
name: run-compote-editor
description: use, integrate, install, import, setup compote-editor document editor library in a client app
---

`compote-editor` is a Svelte 5 document editor library built on TipTap v3 with live pagination and Paged.js print support. This skill is for agents working in a **consumer app** that imports this library.

## Installation

```bash
bun add compote-editor
# peer dep required:
bun add svelte@^5
```

## Basic usage

```svelte
<script lang="ts">
	import { DocumentEditor, printWithPagedJs, PageBreak } from 'compote-editor';
	import StarterKit from '@tiptap/starter-kit';

	let html = $state('');
</script>

<DocumentEditor
	extensions={[StarterKit, PageBreak]}
	bind:content={html}
	format="A4"
	onPrint={() => printWithPagedJs({ content: html, format: 'A4' })}
/>
```

## `DocumentEditor` props

| Prop         | Type                             | Default        | Description                        |
| ------------ | -------------------------------- | -------------- | ---------------------------------- |
| `extensions` | `Extensions`                     | `[StarterKit]` | TipTap extensions to load          |
| `content`    | `string` (bindable)              | `''`           | HTML content — two-way bound       |
| `format`     | `'A4' \| 'Letter'`               | `'A4'`         | Page size                          |
| `pagination` | `Partial<PaginationPlusOptions>` | `{}`           | Override live pagination config    |
| `class`      | `string`                         | `''`           | Extra CSS classes on outer wrapper |
| `onUpdate`   | `(html: string) => void`         | —              | Called on every edit               |
| `onPrint`    | `() => void`                     | —              | Wires up the print toolbar button  |

`bind:content` gives you the serialized HTML on every keystroke. Use `onUpdate` instead if you only want to react (no two-way binding needed).

## Printing

### Browser print dialog (client-side only)

```ts
import { printWithPagedJs } from 'compote-editor';

printWithPagedJs({ content: html, format: 'A4' });
// Hidden iframe → Paged.js paginates → browser print dialog → iframe removed.
// No new tab opens.
```

### Generate printable HTML string (for headless / server PDF)

```ts
import { buildPagedJsHtml } from 'compote-editor';

const fullHtml = buildPagedJsHtml({ content: html, format: 'A4', lang: 'en' });
// Complete standalone HTML document with Paged.js bundled inline.
// Pass to headless Chrome / puppeteer / playwright for PDF generation.
```

## Supported extensions

The toolbar auto-detects loaded extensions and shows only the relevant buttons. Typography CSS (`.document-content`) styles the output for these node/mark types both in the editor and in print.

| Extension    | Package                        | Toolbar button | Notes                                                                                                                   |
| ------------ | ------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `StarterKit` | `@tiptap/starter-kit`          | —              | Bundle: Bold, Italic, Heading, History, BulletList, OrderedList, Code, CodeBlock, Blockquote, HorizontalRule, HardBreak |
| `underline`  | `@tiptap/extension-underline`  | U              | Not in StarterKit — add separately                                                                                      |
| `textAlign`  | `@tiptap/extension-text-align` | ← ↔ → ≡        | Configure with `types: ['heading', 'paragraph']`                                                                        |
| `PageBreak`  | `compote-editor`               | ✂              | Exported from this library                                                                                              |

Extensions not listed above (e.g. `TaskList`, `Table`, `Image`) have no toolbar button but their HTML is styled by `typography.css` if you add them — the editor will render them correctly, they just won't appear in the toolbar.

## Extensions

### PageBreak — manual page break

```ts
import { PageBreak } from 'compote-editor';

// Add to the extensions array.
// Keyboard: Ctrl/Cmd+Enter inserts a break.
// In editor: shows as a dashed line.
// In print: CSS break-after: page.
extensions={[StarterKit, PageBreak]}
```

### Adding TipTap extensions

```ts
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';

extensions={[
  StarterKit,
  PageBreak,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
]}
// The toolbar auto-detects which extensions are loaded and shows
// only the relevant buttons (heading, lists, alignment, bold/italic/underline, page break).
```

## Live pagination options

`DocumentEditor` internally uses `PaginationPlus`. Override via the `pagination` prop:

```svelte
<DocumentEditor
	{extensions}
	bind:content={html}
	format="A4"
	pagination={{
		headerLeft: 'My Document',
		headerRight: 'Page {page}',
		footerRight: 'Page {page} of {total}',
		pageGap: 30
	}}
/>
```

Or drive pagination commands imperatively — export the editor reference if needed via `onUpdate` + a stored TipTap `Editor` instance.

## Page formats / sizes

```ts
import { PAGE_FORMATS, PAGE_SIZES, type PageFormatKey } from 'compote-editor';

PAGE_FORMATS.A4; // → { marginTop: '25mm', marginBottom: '25mm', marginLeft: '20mm', marginRight: '20mm' }
PAGE_SIZES.A4; // → { pageHeight: 1123, pageWidth: 794, marginTop: 96, ... } (pixels for PaginationPlus)
PAGE_SIZES.Letter; // → { pageHeight: 1056, pageWidth: 816, ... }
```

## Gotchas

- **`StarterKit` already includes Bold, Italic, Heading, History, BulletList, OrderedList.** Don't add those individually — TipTap warns about duplicates.
- **Content is HTML, not JSON.** `bind:content` reads/writes `editor.getHTML()`. Feed it saved HTML strings, not ProseMirror JSON.
- **`printWithPagedJs` is browser-only.** It creates a DOM iframe. Call it only in `onclick` handlers or browser-side code, never during SSR.
- **`buildPagedJsHtml` bundles ~180 KB of Paged.js inline.** The returned string is large — don't store it in state; generate it only when printing or exporting.
- **`pageBreakBackground` uses a CSS variable.** The default is `var(--color-surface-2)`. If your app doesn't define that token, the page gap will be transparent. Override it via `pagination={{ pageBreakBackground: '#f0f0f0' }}`.
