---
name: compote-editor
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

### HTML document editing

```svelte
<script lang="ts">
	import { DocumentEditor } from 'compote-editor';

	let html = $state('');
</script>

<DocumentEditor bind:content={html} format="A4" />
```

### Template editing with JSON content

Use template mode when the consumer app is preparing reusable templates. Store templates as
TipTap JSON, not HTML, so template variables remain structured nodes.

```svelte
<script lang="ts">
	import { DocumentEditor, type TemplateVariableDefinition } from 'compote-editor';
	import type { JSONContent } from '@tiptap/core';

	const templateVariables: TemplateVariableDefinition[] = [
		{ id: 'customer.name', label: 'Customer Name', group: 'Customer' },
		{ id: 'customer.pib', label: 'Customer PIB', group: 'Customer' }
	];

	let templateJson = $state<JSONContent>({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Dear ' },
					{
						type: 'templateVariable',
						attrs: { id: 'customer.name', label: 'Customer Name' }
					}
				]
			}
		]
	});
</script>

<DocumentEditor
	mode="template"
	contentFormat="json"
	bind:content={templateJson}
	{templateVariables}
/>
```

## `DocumentEditor` props

| Prop                | Type                                        | Default        | Description                                          |
| ------------------- | ------------------------------------------- | -------------- | ---------------------------------------------------- |
| `mode`              | `'editor' \| 'template' \| 'readonly'`      | `'editor'`     | Editor behavior mode                                 |
| `contentFormat`     | `'html' \| 'json'`                          | mode-based     | Serialization format for `content` updates           |
| `extensions`        | `Extensions`                                | `[]`           | Extra TipTap extensions to load or override defaults |
| `content`           | `string \| JSONContent` (bindable)          | `''`           | HTML or TipTap JSON content                          |
| `templateVariables` | `TemplateVariableDefinition[]`              | `[]`           | Variables shown in the toolbar insert menu           |
| `format`            | `'A4' \| 'Letter'`                          | `'A4'`         | Page size                                            |
| `pagination`        | `Partial<DocumentPaginationOptions>`        | `{}`           | Override live pagination config                      |
| `class`             | `string`                                    | `''`           | Extra CSS classes on outer wrapper                   |
| `onUpdate`          | `(content: string \| JSONContent) => void`  | —              | Called on every edit                                 |
| `onSave`            | `({ content, html, json, editor }) => void` | —              | Shows the save toolbar button and wires Ctrl/Cmd+S   |
| `onPrint`           | `() => void`                                | built-in print | Override the print toolbar button                    |

The prop types intentionally prevent invalid combinations such as
`mode="template" contentFormat="html"`. Template mode uses JSON content. HTML content remains the
default for regular document editing.

Valid combinations:

```svelte
<DocumentEditor bind:content={html} />
<DocumentEditor mode="readonly" contentFormat="html" content={renderedHtml} />
<DocumentEditor mode="template" contentFormat="json" bind:content={templateJson} />
<DocumentEditor mode="readonly" contentFormat="json" content={templateJson} />
```

`bind:content` gives the serialized content on every keystroke in the selected format. Use
`onUpdate` instead if you only want to react and do not need two-way binding.

## Saving

`DocumentEditor` does not persist content itself. Pass `onSave` when the client app wants a save button and Ctrl/Cmd+S behavior:

```svelte
<DocumentEditor
	bind:content={html}
	onSave={async ({ html, json }) => {
		await saveDocument({ html, json });
	}}
/>
```

The save callback receives `content` in the configured `contentFormat`, plus both `html` and `json`
snapshots and the TipTap editor instance. Async saves disable the save button until the promise
settles.

For templates, save `json` as the source of truth:

```svelte
<DocumentEditor
	mode="template"
	contentFormat="json"
	bind:content={templateJson}
	onSave={async ({ json }) => {
		await saveTemplate(json);
	}}
/>
```

## Printing

### Browser print dialog (client-side only)

```ts
import { printWithPagedJs } from 'compote-editor';

printWithPagedJs({ content: html, format: 'A4' });
// Hidden iframe → Paged.js paginates → browser print dialog → iframe removed.
// No new tab opens.
```

`DocumentEditor` uses this helper by default for its print toolbar button. If the editor is in
template mode, print shows template placeholders. For populated documents, render the template
through the consumer app first, then pass the rendered HTML to a readonly editor or directly to
`printWithPagedJs`.

### Generate printable HTML string (for headless / server PDF)

```ts
import { buildPagedJsHtml } from 'compote-editor';

const fullHtml = buildPagedJsHtml({ content: html, format: 'A4', lang: 'en' });
// Complete standalone HTML document with Paged.js bundled inline.
// Pass to headless Chrome / puppeteer / playwright for PDF generation.
```

## Default supported extensions

`DocumentEditor` loads the supported editing extensions by default. The toolbar auto-detects loaded extensions and shows only the relevant buttons. Typography CSS (`.document-content`) styles the output for these node/mark types both in the editor and in print.

| Extension          | Package                         | Toolbar button | Notes                                                                                                                    |
| ------------------ | ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `StarterKit`       | `@tiptap/starter-kit`           | undo/redo      | Bundle: Bold, Italic, Underline, Heading, UndoRedo, BulletList, OrderedList, Code, CodeBlock, Blockquote, HorizontalRule |
| `underline`        | `@tiptap/starter-kit`           | U              | Included through StarterKit                                                                                              |
| `textAlign`        | `@tiptap/extension-text-align`  | ← ↔ → ≡        | Configure with `types: ['heading', 'paragraph']`                                                                         |
| `PageBreak`        | `compote-editor`                | ✂              | Exported from this library                                                                                               |
| `TemplateVariable` | `compote-editor`                | `{}` menu      | Inline atom for template placeholders; export maps IDs to app-specific data/Liquid                                       |
| `fontSize`         | `@tiptap/extension-text-style`  | size select    | Loaded with `TextStyle`                                                                                                  |
| `superscript`      | `@tiptap/extension-superscript` | x²             | Superscript mark                                                                                                         |
| `subscript`        | `@tiptap/extension-subscript`   | x₂             | Subscript mark                                                                                                           |
| `table`            | `@tiptap/extension-table`       | table menu     | Loaded via `TableKit` with resizable tables                                                                              |

Extensions not listed above (e.g. `TaskList`, `Table`, `Image`) have no toolbar button but their HTML is styled by `typography.css` if you add them — the editor will render them correctly, they just won't appear in the toolbar.

## Extensions

### PageBreak — manual page break

```ts
import { PageBreak } from 'compote-editor';

// Loaded by default.
// Keyboard: Ctrl/Cmd+Enter inserts a break.
// In editor: shows as a dashed line.
// In print: CSS break-after: page.
```

### TemplateVariable — template placeholder

```ts
import { TemplateVariable, type TemplateVariableDefinition } from 'compote-editor';

// Loaded by default.
// Stores JSON nodes with attrs: { id, label }.
// In editor/print: renders as a visible placeholder chip like [Customer Name].
```

Template variables are generic editor primitives. The consumer app owns business meaning, LiquidJS
mapping, filters, loops, and rendering real data.

Recommended architecture:

```text
Template edit mode:
TipTap JSON with templateVariable nodes → save JSON

Generated document:
Template JSON → app serializes variables/blocks to Liquid → LiquidJS + data → rendered HTML
→ <DocumentEditor mode="readonly" contentFormat="html" content={renderedHtml} />
```

Define the available insert menu fields in the consumer app:

```ts
const templateVariables: TemplateVariableDefinition[] = [
	{ id: 'customer.name', label: 'Customer Name', group: 'Customer' },
	{ id: 'customer.pib', label: 'Customer PIB', group: 'Customer' }
];
```

Map IDs to Liquid in the consumer app, not in `compote-editor`:

```ts
const liquidByVariableId = {
	'customer.name': '{{ customer.name }}',
	'customer.pib': `{% for ident in customer.contact_identification %}
{% if ident.contact_identification_type.code == "pib" %}{{ ident.value }}{% endif %}
{% endfor %}`
};
```

### Adding TipTap extensions

All supported toolbar extensions are already loaded by default:

```ts
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TableKit } from '@tiptap/extension-table';
import { PageBreak } from 'compote-editor';
import { TemplateVariable } from 'compote-editor';

const supportedDefaults = [
	StarterKit,
	TextAlign.configure({ types: ['heading', 'paragraph'] }),
	TextStyle,
	FontSize,
	Superscript,
	Subscript,
	TableKit.configure({
		table: { resizable: true }
	}),
	PageBreak,
	TemplateVariable
];
```

Pass `extensions` only when adding custom extensions or overriding one of the defaults. Extensions are merged by extension name, so a configured default replaces the built-in one instead of duplicating it.

```svelte
<script lang="ts">
	import { DocumentEditor } from 'compote-editor';
	import TextAlign from '@tiptap/extension-text-align';
	import CustomExtension from './custom-extension';

	let html = $state('');
</script>

<DocumentEditor
	bind:content={html}
	extensions={[TextAlign.configure({ types: ['heading'] }), CustomExtension]}
/>
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
- **Regular editing defaults to HTML.** `bind:content` reads/writes `editor.getHTML()` unless `contentFormat="json"` is selected.
- **Template mode is JSON-only.** Use `mode="template" contentFormat="json"` and store TipTap JSON as the template source of truth.
- **Readonly does not render data by itself.** `mode="readonly" contentFormat="json"` shows a locked template with placeholders. To show populated values, render with LiquidJS in the consumer app and pass `renderedHtml` with `contentFormat="html"`.
- **`TemplateVariable` stores IDs, not Liquid.** Keep Liquid expressions, data lookup, filters, loops, and conditional logic in the consumer app.
- **`printWithPagedJs` is browser-only.** It creates a DOM iframe. Call it only in `onclick` handlers or browser-side code, never during SSR.
- **`buildPagedJsHtml` bundles ~180 KB of Paged.js inline.** The returned string is large — don't store it in state; generate it only when printing or exporting.
- **`pageBreakBackground` uses a CSS variable.** The default is `var(--color-surface-2)`. If your app doesn't define that token, the page gap will be transparent. Override it via `pagination={{ pageBreakBackground: '#f0f0f0' }}`.
