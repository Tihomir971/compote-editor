<script lang="ts">
	import { DocumentEditor } from '$lib';

	let html = $state(
		`<h1>Hello compote-editor!</h1>
<p>All supported editing extensions are loaded by default.</p>
<h2>Inline formatting</h2>
<p>This paragraph includes <strong>bold</strong>, <em>italic</em>, <u>underline</u>, H<sub>2</sub>O, and x<sup>2</sup>.</p>
<p><span style="font-size: 18pt">This sentence uses the font size extension.</span></p>
<h2>Lists and alignment</h2>
<ul><li>Bullet item one</li><li>Bullet item two</li><li>Bullet item three</li></ul>
<ol><li>Ordered item one</li><li>Ordered item two</li></ol>
<p style="text-align: center">This paragraph is centered with TextAlign.</p>
<h2>Table</h2>
<table><tbody><tr><th>Name</th><th>Status</th><th>Notes</th></tr><tr><td>StarterKit</td><td>Default</td><td>Headings, lists, history, code, blockquote, horizontal rule</td></tr><tr><td>TableKit</td><td>Default</td><td>Resizable table support</td></tr></tbody></table>
<div data-type="page-break"></div>
<h2>After page break</h2>
<p>This content starts after a manual page break.</p>`
	);

	function save() {
		console.info('Saved document HTML', html);
	}
</script>

<div class="mx-auto max-w-7xl p-8">
	<h1 class="mb-2 text-2xl font-bold">compote-editor demo</h1>
	<p class="mb-6 text-sm text-ink-dim">
		The supported editing extensions are loaded by default. Pass extra TipTap extensions via the
		<code>extensions</code> prop to customize.
	</p>

	<DocumentEditor bind:content={html} format="A4" onSave={save} />

	<details class="mt-6">
		<summary class="cursor-pointer text-sm font-medium text-ink-dim">HTML output</summary>
		<pre class="mt-2 overflow-auto rounded-md bg-surface-2 p-3 text-xs">{html}</pre>
	</details>
</div>
