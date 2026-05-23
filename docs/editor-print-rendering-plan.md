# Editor and Print Rendering Plan

## Goal

Create a document editor/rendering package where the editable view, preview view, and generated PDF all use the same document rendering contract.

The main problem to solve is that the current app editor renders inside the application DOM, while PDF generation renders isolated HTML in Playwright/Chromium. App styles, resets, themes, editor-only styles, and component library CSS can affect the editor but not the PDF, so the document can look different when printed.

The target behavior:

- Preview and PDF use the same HTML builder and same CSS.
- Editing an A4 document uses the same document CSS, dimensions, margins, font metrics, and typography as preview/PDF as much as practical.
- Preview and PDF use the same bundled Noto Sans webfont instead of relying on operating system fonts.
- If exact live editor line breaks are required, the editor is mounted inside the same isolated document surface as preview/PDF.
- The app shell can use Tailwind, themes, cards, dark mode, etc. without changing document layout.
- PDF generation can be debugged by saving/opening the exact HTML sent to the print API.

## Implementation Strategy

Do not start by moving the Tiptap editor into an iframe. That is the highest-risk part of the work because it affects focus, selection, keyboard handling, toolbar commands, extension behavior, and lifecycle.

Implement this in phases:

1. First make preview and PDF identical.
2. Then make the visible editor use the same document CSS and page dimensions.
3. Only move Tiptap fully into an iframe if exact live editor line breaks are required.

This gives an early proof that the print contract is correct before taking on iframe editor complexity.

## Recommended Architecture

Build a separate editor/document package that owns the document rendering layer.

Suggested structure:

```txt
editor-lib/
  src/
    components/
      DocumentEditor.svelte
      DocumentPreview.svelte
      PrintableFrame.svelte
      EditorToolbar.svelte
    print/
      build-printable-html.ts
      document.css
      typography.css
      page-formats.ts
      fonts/
        NotoSans-Regular.woff2
        NotoSans-Bold.woff2
        NotoSans-Italic.woff2
        NotoSans-BoldItalic.woff2
    tiptap/
      extensions/
        page-break.ts
        custom-horizontal-rule.ts
    types.ts
```

The package should expose:

```ts
export { default as DocumentEditor } from './components/DocumentEditor.svelte';
export { default as DocumentPreview } from './components/DocumentPreview.svelte';
export { buildPrintableHtml } from './print/build-printable-html';
export type { PageFormat, PrintableDocumentOptions } from './types';
```

## Core Rule

There must be one document stylesheet and one printable HTML builder.

Do not maintain separate CSS for:

- editor document
- preview document
- PDF document

Instead:

- `document.css` defines page size, reset, body rules, page shells, and print behavior.
- `typography.css` defines document content typography.
- Bundled Noto Sans font files define the document font metrics.
- UI-only editor styles are scoped outside the printable document surface.

## Content Contract

`buildPrintableHtml()` receives trusted document body HTML. In the first implementation, this is raw Tiptap HTML.

The print contract should explicitly support the HTML emitted by the enabled Tiptap extensions. `typography.css` may style Tiptap-specific selectors when those selectors are part of the supported document model.

Examples:

```css
.document-content ul[data-type='taskList'] {
	list-style: none;
	padding-left: 0;
}

.document-content li[data-type='taskItem'] {
	display: flex;
	gap: 0.5em;
}

.document-content hr[data-type='page-break'] {
	break-after: page;
	page-break-after: always;
}
```

Every custom Tiptap extension should define its printable HTML contract. If the editor output becomes too editor-specific or unstable, add a normalization step later that converts Tiptap HTML into a smaller semantic print HTML format before calling `buildPrintableHtml()`.

## Rendering Model

Use an isolated document surface for preview and, eventually, the editor if exact editing parity is needed.

Preferred option: iframe.

Why iframe:

- Prevents app CSS from leaking into document layout.
- Matches Playwright/PDF behavior more closely.
- Allows loading the exact same CSS used by PDF HTML.
- Easier to debug because the iframe document can be inspected independently.

Alternative: shadow root.

Shadow root is also viable, but iframe is closer to the PDF service because Playwright receives a complete HTML document.

## Preview Scaling

The preview must render the document at its true page size, then scale the preview surface to fit the available app UI.

An A4 page is roughly `794px` wide and `1123px` tall at 96 CSS pixels per inch, before shadows, gutters, or surrounding chrome. It will not fit inside every sidebar, split pane, or mobile viewport.

`PrintableFrame.svelte` should own screen-only scaling:

- Render the iframe/page using the real document dimensions.
- Measure the available container width.
- Apply a wrapper transform for screen preview.
- Keep the printable document HTML unscaled.
- Avoid putting scale rules inside `document.css`.

Suggested API:

```svelte
<PrintableFrame html={html} scale="fit-width" />
<PrintableFrame html={html} scale={0.75} />
```

Prefer `transform: scale(...)` on an outer preview wrapper over CSS `zoom`. The transform should affect only the app preview surface, not the document HTML sent to Playwright.

## Page Format Contract

Define page formats in code, not scattered CSS literals.

Example:

```ts
export const PAGE_FORMATS = {
	A4: {
		width: '210mm',
		height: '297mm',
		marginTop: '25mm',
		marginRight: '20mm',
		marginBottom: '25mm',
		marginLeft: '20mm'
	}
} as const;
```

The CSS should use the same values:

```css
@page {
	size: A4;
	margin: 25mm 20mm;
}

html,
body {
	margin: 0;
	padding: 0;
	background: white;
}

.document-page {
	width: 210mm;
	min-height: 297mm;
	box-sizing: border-box;
	padding: 25mm 20mm;
	background: white;
	color: black;
}

@media print {
	.document-page {
		width: auto;
		min-height: auto;
		padding: 0;
		box-shadow: none;
	}
}
```

Important: choose one margin model.

Option A:

- Browser preview page has padding.
- PDF uses `page.pdf({ margin: 0, preferCSSPageSize: true })`.
- CSS `@page` and `.document-page` control layout.

Option B:

- Browser preview page has padding for visual accuracy.
- PDF uses Playwright `margin`.
- PDF HTML body contains content only, without page padding.

Recommended: Option A. Let CSS be the source of truth and use `preferCSSPageSize: true`.

## Printable HTML Builder

Create one function used by preview and API calls:

```ts
import documentCss from './document.css?raw';
import typographyCss from './typography.css?raw';

export function buildPrintableHtml(options: {
	content: string;
	format?: 'A4';
	editable?: boolean;
}): string {
	const { content, format = 'A4', editable = false } = options;

	return `<!DOCTYPE html>
<html lang="sr" data-format="${format}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${documentCss}
${typographyCss}
</style>
</head>
<body>
<main class="document-page">
<div class="tiptap document-content" ${editable ? 'contenteditable="true"' : ''}>
${content}
</div>
</main>
</body>
</html>`;
}
```

Keep the `<!DOCTYPE html>` in the builder. Some Chromium/Playwright page-size behavior is more reliable when the document is in standards mode.

For Tiptap editor integration, the iframe body can eventually be initialized with the same document shell, then Tiptap mounts into `.document-content`.

Important: this should not be the first migration step. Use the same builder for preview/PDF first, validate that output matches, then decide whether iframe-mounted editing is necessary.

## DocumentEditor Behavior

`DocumentEditor.svelte` has two acceptable implementation levels.

Level 1, simpler editor parity:

- Render the editor in the app DOM.
- Apply the same `document.css` and `typography.css` document classes to the editable surface.
- Show the editor in an A4-sized page shell.
- Keep preview/PDF as the final rendering truth.

Level 2, exact live editor parity:

- Render an iframe document using the same CSS as PDF.
- Mount Tiptap inside the iframe document.
- Keep toolbar UI outside the iframe.
- Pass editor commands from toolbar to the iframe-mounted Tiptap instance.
- Serialize content as normal Tiptap HTML.

Use Level 2 only if Level 1 still produces unacceptable line-break or layout differences while editing.

Expected API:

```svelte
<DocumentEditor
	bind:editor
	content={content}
	format="A4"
	onUpdate={handleUpdate}
/>
```

The editor toolbar should not live inside the printable document unless it is intentionally part of the document.

## DocumentPreview Behavior

`DocumentPreview.svelte` should:

- Render read-only HTML using `PrintableFrame.svelte` and the same iframe/document builder.
- Support screen-only preview scaling without changing the printable HTML.
- Split pages only if manual page-break nodes are used.
- Avoid app-level `.tiptap`, Tailwind typography, or card styling inside the document.

Expected API:

```svelte
<DocumentPreview html={renderedHtml} format="A4" />
```

## Page Breaks

Keep explicit page breaks as:

```html
<hr data-type="page-break">
```

Print CSS:

```css
hr[data-type='page-break'] {
	break-after: page;
	page-break-after: always;
	border: 0;
	margin: 0;
}

@media screen {
	hr[data-type='page-break'] {
		display: block;
		height: 0;
		margin: 24px 0;
		border-top: 2px dashed #999;
	}
}
```

PDF HTML should not need manual page wrapping if CSS page breaks are correct.

## API Integration

Current API route:

```ts
await page.setViewportSize({ width: 643, height: 935 });
await page.setContent(html, { waitUntil: 'networkidle' });

const pdfBuffer = await page.pdf({
	format: options?.format ?? 'A4',
	landscape: options?.landscape ?? false,
	printBackground: true,
	margin: resolvedMargin
});
```

Recommended API behavior:

```ts
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const pdfBuffer = await page.pdf({
	format: options?.format ?? 'A4',
	landscape: options?.landscape ?? false,
	printBackground: true,
	preferCSSPageSize: true,
	margin: {
		top: '0',
		right: '0',
		bottom: '0',
		left: '0'
	}
});
```

Why:

- The HTML/CSS controls page size and margins.
- The preview and PDF use the same layout rules.
- `setViewportSize` is no longer responsible for text reflow.
- Fonts are loaded before PDF generation, reducing text metric and line-break differences.

Test `preferCSSPageSize: true` early with minimal HTML before wiring Tiptap output. The printable builder must include `<!DOCTYPE html>`.

If you keep API margins, remove page padding from the printable HTML. Do not use both CSS page padding and Playwright margins for the same document margins.

## Debug Mode for Print API

Add a debug option to the API request:

```ts
const pdfSchema = z.object({
	html: z.string().min(1),
	debug: z.boolean().optional(),
	options: z
		.object({
			format: z.enum(['A4', 'Letter']).optional(),
			landscape: z.boolean().optional(),
			margin: marginSchema.optional()
		})
		.optional()
});
```

When `debug: true`, return or save:

- the exact HTML received by the API
- a Playwright screenshot before PDF generation
- optionally the PDF

Example implementation:

```ts
if (debug) {
	await page.screenshot({
		path: `debug/pdf-${Date.now()}.png`,
		fullPage: true
	});
}
```

For local development, also write the HTML:

```ts
await Bun.write(`debug/pdf-${Date.now()}.html`, html);
```

Create the `debug/` directory locally and ignore it in git.

Ship debug mode before preview/PDF comparison work. Saved HTML and screenshots are the fastest way to identify whether a mismatch comes from the HTML contract, browser rendering, font loading, or PDF generation.

## API Testing

Use a minimal test HTML first. Do not start with Tiptap output.

Example request body:

```json
{
	"html": "<!DOCTYPE html><html><head><style>@font-face{font-family:'Document Sans';src:url('http://app:3000/fonts/NotoSans-Regular.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block}@page{size:A4;margin:25mm 20mm}body{margin:0;font-family:'Document Sans',sans-serif}.document-page{width:210mm;min-height:297mm;box-sizing:border-box;padding:25mm 20mm}.document-content{font-size:16px;line-height:1.6}</style></head><body><main class=\"document-page\"><div class=\"document-content\"><h1>Test Document</h1><p>This paragraph should match preview and PDF.</p></div></main></body></html>",
	"debug": true,
	"options": {
		"format": "A4"
	}
}
```

Test with curl:

```sh
curl -X POST http://localhost:3000/api/pdf \
	-H "Content-Type: application/json" \
	-d @payload.json \
	--output test.pdf
```

Or with Bun:

```ts
const response = await fetch('http://localhost:3000/api/pdf', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(payload)
});

await Bun.write('test.pdf', response);
```

Validation checklist:

- The debug HTML opened in the browser matches the expected page.
- The debug screenshot matches the HTML view.
- The PDF matches the debug screenshot.
- Text line breaks match between iframe preview and PDF.
- Manual page breaks create new PDF pages.
- Fonts are loaded before PDF generation.

## Font Loading

Do not rely on operating system fonts for the document rendering contract. The PDF service runs in Docker/Linux, where fonts like Arial may not exist and Chromium may silently substitute a different font. Font substitution can change line breaks and pagination.

Use bundled Noto Sans as the default document font.

Recommended font files:

```txt
src/lib/print/fonts/
  NotoSans-Regular.woff2
  NotoSans-Bold.woff2
  NotoSans-Italic.woff2
  NotoSans-BoldItalic.woff2
```

Recommended CSS:

```css
@font-face {
	font-family: 'Document Sans';
	src: url('./fonts/NotoSans-Regular.woff2') format('woff2');
	font-weight: 400;
	font-style: normal;
	font-display: block;
}

@font-face {
	font-family: 'Document Sans';
	src: url('./fonts/NotoSans-Bold.woff2') format('woff2');
	font-weight: 700;
	font-style: normal;
	font-display: block;
}

@font-face {
	font-family: 'Document Sans';
	src: url('./fonts/NotoSans-Italic.woff2') format('woff2');
	font-weight: 400;
	font-style: italic;
	font-display: block;
}

@font-face {
	font-family: 'Document Sans';
	src: url('./fonts/NotoSans-BoldItalic.woff2') format('woff2');
	font-weight: 700;
	font-style: italic;
	font-display: block;
}

html,
body,
.document-content {
	font-family: 'Document Sans', sans-serif;
}
```

For the preview iframe, the font URL can be loaded by the app bundler if the CSS is served as part of the app.

For PDF generation with `page.setContent(html)`, relative font URLs are risky unless Playwright has a reachable base URL. Choose one of these approaches:

- Inline the Noto Sans font files as base64 `data:` URLs in the generated printable HTML for the most deterministic output.
- Or rewrite font URLs in the printable HTML to absolute URLs reachable from the Docker container, for example `http://app:3000/fonts/NotoSans-Regular.woff2`.

The preview and PDF must use the same font source. Do not let preview use a bundled browser asset while the PDF uses a different Docker-installed fallback font.

Always wait for fonts before PDF:

```ts
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
```

If fonts are not loaded, text metrics can change and line breaks may differ.

Relative font URLs inside HTML passed to `page.setContent()` may not resolve unless the Playwright page has a reachable base URL. Do not assume app-relative font paths work in the PDF service.

## Migration Plan

### Phase 1: Shared Print Contract

1. Extract current typography rules into `typography.css`.
2. Create `page-formats.ts` with page dimensions and margins.
3. Create `document.css` with full reset, page size, margins, page shell, and print rules.
4. Create `buildPrintableHtml()`.
5. Define the supported Tiptap HTML contract for headings, paragraphs, lists, tables, marks, custom nodes, and page breaks.
6. Add bundled Noto Sans font files and wire them into `document.css`.
7. Add debug mode to the print API.
8. Decide whether PDF HTML will inline Noto Sans as base64 or use Docker-reachable absolute font URLs.
9. Run a minimal PDF test with `<!DOCTYPE html>`, `@page`, `preferCSSPageSize: true`, zero PDF margins, and Noto Sans loaded.

### Phase 2: Preview/PDF Parity

1. Create `PrintableFrame.svelte` with iframe rendering and screen-only scaling.
2. Create `DocumentPreview.svelte` using `PrintableFrame.svelte` and `buildPrintableHtml()`.
3. Update the print API caller to send HTML from `buildPrintableHtml()`.
4. Update the print API to use `preferCSSPageSize: true` and zero PDF margins.
5. Compare preview iframe, debug HTML, debug screenshot, and PDF using the same sample document.

At the end of this phase, preview and PDF should match. This is the main milestone.

### Phase 3: Editor Visual Parity

1. Update the existing editor surface to use the same document typography rules.
2. Render the editor inside an A4 page shell with the same width and padding model.
3. Keep toolbar UI outside the document surface.
4. Compare editor, preview, and PDF with headings, paragraphs, lists, tables, bold, italic, and manual page breaks.

This phase should be attempted before iframe-mounted editing. It may be good enough for the product.

### Phase 4: Exact Live Editor Parity, If Needed

1. Create `DocumentEditor.svelte` with Tiptap mounted inside an iframe.
2. Initialize the iframe using the same document shell and CSS as `buildPrintableHtml()`.
3. Pass toolbar commands to the iframe-mounted Tiptap instance.
4. Verify focus, selection, undo/redo, keyboard shortcuts, extension behavior, and serialization.
5. Replace the current template editor only after the iframe editor is stable.

## Acceptance Criteria

- A sample document has identical line breaks in preview and PDF.
- A document with headings, paragraphs, lists, tables, bold, italic, and page breaks matches between preview and PDF.
- Preview can fit an A4 page into smaller containers without changing the printable HTML.
- Preview and PDF use the same bundled Noto Sans font source.
- Removing app CSS imports does not change document rendering.
- Changing app theme/dark mode does not change document rendering.
- PDF can be debugged from saved HTML and screenshot.
- There is one source of truth for document CSS.
- The supported Tiptap HTML output is documented and styled by the document stylesheet.
- The editor uses the same document CSS and page dimensions.
- Exact editor/PDF line-break matching is required only if the iframe-mounted editor phase is implemented.

## Important Avoidances

- Do not let Tailwind utility classes control document typography.
- Do not let app themes set document colors or font sizes.
- Do not use both CSS page margins and Playwright PDF margins.
- Do not scale the printable HTML itself to make app preview fit. Scale only the preview wrapper.
- Do not rely on app-relative font URLs unless the PDF service can resolve them.
- Do not rely on Arial or other operating system fonts in Docker for final document metrics.
- Do not maintain separate editor-preview CSS and PDF CSS.
- Do not treat the Tiptap editable DOM as the final print contract unless it is rendered inside the same isolated document shell.
