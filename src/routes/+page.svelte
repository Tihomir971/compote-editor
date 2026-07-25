<script lang="ts">
	import { DocumentEditor, PAGE_FORMAT_KEYS, getPageGeometry } from '$lib';
	import type { JSONContent } from '@tiptap/core';
	import type { PageFormatKey, TemplateVariableDefinition } from '$lib';
	import { JsonTreeView, ScrollArea } from 'compote-ui';

	let format = $state<PageFormatKey>('A4');
	let geometry = $derived(getPageGeometry(format));

	// Paragraphs are numbered so you can name the exact block a page break lands on and
	// compare the on-screen break against the printed one.
	const shortParagraphs = (from: number, to: number) =>
		Array.from({ length: to - from + 1 }, (_, i) => {
			const n = from + i;
			const filler =
				n % 3 === 0
					? 'It is deliberately short so that a run of them produces many candidate break points close together.'
					: n % 3 === 1
						? 'This one runs a little longer than its neighbours, which makes differences in line wrapping between the editor and the printed page easy to spot when the content box width is even slightly off.'
						: 'Short block.';
			return `<p>[${n}] ${filler}</p>`;
		}).join('\n');

	const tableRows = (count: number) =>
		Array.from({ length: count }, (_, i) => {
			const n = i + 1;
			return `<tr><td>R${n}</td><td>Section ${Math.ceil(n / 4)}</td><td>Measured block ${n}</td><td>${n % 4 === 0 ? 'Review' : 'OK'}</td></tr>`;
		}).join('');

	let html = $state(
		`<h1>Hello compote-editor!</h1>
<p>All supported editing extensions are loaded by default. This document is intentionally several pages long so pagination, page breaks and table fragmentation can be exercised.</p>
<h2>Inline formatting</h2>
<p>This paragraph includes <strong>bold</strong>, <em>italic</em>, <u>underline</u>, H<sub>2</sub>O, and x<sup>2</sup>.</p>
<p><span style="font-size: 18pt">This sentence uses the font size extension.</span></p>
<h2>Lists and alignment</h2>
<ul><li>Bullet item one</li><li>Bullet item two</li><li>Bullet item three</li></ul>
<ol><li>Ordered item one</li><li>Ordered item two</li></ol>
<p style="text-align: center">This paragraph is centered with TextAlign.</p>
<h2>Short paragraphs, first run</h2>
${shortParagraphs(1, 12)}
<h2>Small table</h2>
<table><tbody><tr><th>Name</th><th>Status</th><th>Notes</th></tr><tr><td>StarterKit</td><td>Default</td><td>Headings, lists, history, code, blockquote, horizontal rule</td></tr><tr><td>TableKit</td><td>Default</td><td>Resizable table support</td></tr></tbody></table>
<h2>Short paragraphs, second run</h2>
${shortParagraphs(13, 26)}
<h2>Tall table</h2>
<p>The table below is taller than a single page. It is the clearest way to see the difference between the editor, which currently moves whole blocks, and Paged.js, which splits rows across pages.</p>
<table><tbody><tr><th>Ref</th><th>Section</th><th>Description</th><th>Status</th></tr>${tableRows(28)}</tbody></table>
<h2>Short paragraphs, third run</h2>
${shortParagraphs(27, 44)}
<h2>Two compact tables back to back</h2>
<table><tbody><tr><th>Key</th><th>Value</th></tr><tr><td>Format</td><td>Selected above</td></tr><tr><td>Engine</td><td>TipTap v3</td></tr><tr><td>Print</td><td>Paged.js</td></tr></tbody></table>
<p>A short paragraph separating the two tables.</p>
<table><tbody><tr><th>Metric</th><th>Screen</th><th>Print</th></tr><tr><td>Content width</td><td>derived</td><td>derived</td></tr><tr><td>Content height</td><td>derived</td><td>derived</td></tr><tr><td>Break granularity</td><td>block</td><td>line</td></tr></tbody></table>
<h2>Short paragraphs, fourth run</h2>
${shortParagraphs(45, 58)}
<div data-type="page-break"></div>
<h2>After page break</h2>
<p>This content starts after a manual page break.</p>
${shortParagraphs(59, 66)}`
	);

	function save() {
		console.info('Saved document HTML', html);
	}

	const templateFields: TemplateVariableDefinition[] = [
		{ id: 'customer.name', label: 'Customer Name', group: 'Customer' },
		{ id: 'customer.pib', label: 'Customer PIB', group: 'Customer' },
		{ id: 'document.date', label: 'Document Date', group: 'Document' }
	];

	let templateJson = $state<JSONContent>({
		type: 'doc',
		content: [
			{
				type: 'heading',
				attrs: { textAlign: null, level: 1 },
				content: [{ type: 'text', text: 'Template example' }]
			},
			{
				type: 'paragraph',
				attrs: { textAlign: null },
				content: [
					{ type: 'text', text: 'Dear ' },
					{
						type: 'templateVariable',
						attrs: { id: 'customer.name', label: 'Customer Name' }
					},
					{ type: 'text', text: ',' }
				]
			},
			{
				type: 'paragraph',
				attrs: { textAlign: null },
				content: [
					{ type: 'text', text: 'Your PIB is ' },
					{
						type: 'templateVariable',
						attrs: { id: 'customer.pib', label: 'Customer PIB' }
					},
					{ type: 'text', text: '.' }
				]
			}
		]
	});

	function saveTemplate() {
		console.info('Saved template JSON', templateJson);
	}
</script>

<div class="mx-auto max-w-7xl p-8">
	<h1 class="mb-2 text-2xl font-bold">compote-editor demo</h1>
	<p class="mb-6 text-sm text-ink-dim">
		The supported editing extensions are loaded by default. Pass extra TipTap extensions via the
		<code>extensions</code> prop to customize.
	</p>
	<div class="mb-3 flex items-center gap-3">
		<label class="text-sm font-medium" for="page-format">Page format</label>
		<select
			id="page-format"
			bind:value={format}
			class="rounded-md border border-border bg-surface-1 px-2 py-1 text-sm"
		>
			{#each PAGE_FORMAT_KEYS as key (key)}
				<option value={key}>{key}</option>
			{/each}
		</select>
		<span class="text-xs text-ink-dim">
			{geometry.width}×{geometry.height}mm, margins {geometry.marginTop}/{geometry.marginRight}/{geometry.marginBottom}/{geometry.marginLeft}mm
		</span>
	</div>
	<div class="h-200">
		<DocumentEditor bind:content={html} page={{ format }} onSave={save} />
	</div>

	<details class="mt-6">
		<summary class="cursor-pointer text-sm font-medium text-ink-dim">HTML output</summary>
		<pre class="mt-2 overflow-auto rounded-md bg-surface-2 p-3 text-xs">{html}</pre>
	</details>
	<div class="h-200">
		<h2 class="mt-10 mb-2 text-xl font-bold">Template mode</h2>
		<p class="mb-6 text-sm text-ink-dim">
			Template variables are stored as JSON nodes and rendered as placeholders in the editor.
		</p>
		<div class="flex h-full">
			<DocumentEditor
				mode="template"
				contentFormat="json"
				bind:content={templateJson}
				template={{ fields: templateFields }}
				page={{ format: 'A4' }}
				onSave={saveTemplate}
			/>

			<div>
				<p>TreeView</p>
				<ScrollArea.Root class="h-96">
					<ScrollArea.Viewport>
						<ScrollArea.Content>
							<JsonTreeView data={$state.snapshot(templateJson)} defaultExpandedDepth={5} />
						</ScrollArea.Content>
					</ScrollArea.Viewport>
					<ScrollArea.Scrollbar orientation="vertical"><ScrollArea.Thumb /></ScrollArea.Scrollbar>
				</ScrollArea.Root>
			</div>
		</div>
	</div>
</div>
