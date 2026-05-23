<script lang="ts">
	import { Editor } from '$lib';
	import TextAlign from '@tiptap/extension-text-align';
	import StarterKit from '@tiptap/starter-kit';

	let html = $state(
		'<h1>Hello compote-editor!</h1><p>Try selecting text and using the toolbar above. StarterKit is loaded by default; TextAlign is added here as an extra.</p>'
	);
</script>

<div class="mx-auto max-w-3xl p-8">
	<h1 class="mb-2 text-2xl font-bold">compote-editor demo</h1>
	<p class="mb-6 text-sm text-ink-dim">
		StarterKit is the default. Pass extra TipTap extensions via the <code>extensions</code> prop to
		customize.
	</p>

	<Editor
		extensions={[StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })]}
		bind:content={html}
		class="mb-6"
	/>

	<details>
		<summary class="cursor-pointer text-sm font-medium text-ink-dim">HTML output</summary>
		<pre class="mt-2 overflow-auto rounded-md bg-surface-2 p-3 text-xs">{html}</pre>
	</details>
</div>
