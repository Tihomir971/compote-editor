# compote-editor

Svelte 5 document editor component built on TipTap v3, with live page pagination, template
variables, table editing, and Paged.js-backed printing.

The package exports a ready-to-use `DocumentEditor` component plus the small set of types and
helpers needed by consumers. Persistence is intentionally left to the consuming app through
callbacks such as `onSave` and `onUpdate`.

## Features

- Svelte 5 component API with bindable HTML or TipTap JSON content.
- TipTap v3 editor defaults for headings, lists, alignment, inline formatting, font size, line
  height, tables, page breaks, and undo/redo.
- Live pagination for A4 and Letter documents, including page margins and manual page breaks.
- Template mode for inserting structured template variables into JSON documents.
- Built-in toolbar using `compote-ui`.
- Print helper that renders document HTML through the bundled Paged.js polyfill.

## Installation

```sh
bun add compote-editor
```

Install the peer dependencies expected by the library:

```sh
bun add svelte compote-ui
```

## Basic Usage

```svelte
<script lang="ts">
	import { DocumentEditor } from 'compote-editor';

	let content = $state('<h1>Hello compote-editor</h1><p>Start writing...</p>');

	function save({ html }: { html: string }) {
		console.info('Saved HTML', html);
	}
</script>

<div class="h-[800px]">
	<DocumentEditor bind:content page={{ format: 'A4' }} onSave={save} />
</div>
```

By default, `DocumentEditor` reads and writes HTML content. It calls `onUpdate` after editor
transactions and calls `onSave` from the toolbar save button or `Ctrl/Cmd + S`.

## Template Mode

Use template mode when the document needs structured placeholders. Template documents use TipTap
JSON content so variable nodes can be preserved.

```svelte
<script lang="ts">
	import { DocumentEditor, type TemplateVariableDefinition } from 'compote-editor';
	import type { JSONContent } from '@tiptap/core';

	const fields: TemplateVariableDefinition[] = [
		{ id: 'customer.name', label: 'Customer Name', group: 'Customer' },
		{ id: 'document.date', label: 'Document Date', group: 'Document' }
	];

	let content = $state<JSONContent>({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text: 'Dear customer,' }]
			}
		]
	});
</script>

<DocumentEditor
	mode="template"
	contentFormat="json"
	bind:content
	template={{ fields }}
	page={{ format: 'A4' }}
/>
```

The toolbar groups template variables by `group` and inserts them as `templateVariable` nodes with
`id` and `label` attributes.

## Readonly JSON Mode

```svelte
<DocumentEditor mode="readonly" contentFormat="json" content={documentJson} />
```

Readonly mode disables editing while keeping the paginated document view and print action
available.

## Component Props

`DocumentEditor` accepts these main props:

- `content`: bindable `string | JSONContent`.
- `mode`: `'editor' | 'template' | 'readonly'`. Defaults to `'editor'`.
- `contentFormat`: `'html' | 'json'`. Defaults to HTML, except template mode defaults to JSON.
- `extensions`: extra TipTap extensions. Extensions with the same name replace the defaults.
- `page`: `{ format, pagination }`, where `format` is `'A4'` or `'Letter'`.
- `classes`: optional class overrides for `root` and `pageArea`.
- `template`: `{ fields }` for template variable insertion.
- `onUpdate`: receives `{ content, html, json, editor }` after editor transactions.
- `onSave`: receives `{ content, html, json, editor }` from save actions.
- `onPrint`: optional custom print handler. If omitted, the editor uses `printWithPagedJs`.

## Exports

```ts
export { DocumentEditor, TemplateVariable, printWithPagedJs } from 'compote-editor';
export type {
	DocumentEditorContent,
	DocumentEditorContentFormat,
	DocumentEditorMode,
	DocumentEditorPageOptions,
	DocumentEditorPayload,
	DocumentEditorSaveHandler,
	DocumentEditorUpdateHandler,
	TemplateVariableDefinition,
	PrintWithPagedJsOptions
} from 'compote-editor';
```

## Printing

The default print action builds a temporary iframe with printable HTML, embedded document
typography, bundled Noto Sans fonts, and the bundled Paged.js polyfill.

You can also call the helper directly:

```ts
import { printWithPagedJs } from 'compote-editor';

printWithPagedJs({
	content: '<h1>Printable document</h1>',
	format: 'A4',
	lang: 'en'
});
```

## Development

```sh
bun run dev
bun run check
bun run lint
bun run build
```

`src/lib` contains the library source. `src/routes` contains the local demo app. Generated output
in `dist` and `.svelte-kit` should not be hand-edited.
