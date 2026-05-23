<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type Extensions } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Toolbar from './Toolbar.svelte';

	interface Props {
		extensions?: Extensions;
		content?: string;
		class?: string;
		onchange?: (html: string) => void;
	}

	let {
		extensions = [StarterKit],
		content = $bindable(''),
		class: className = '',
		onchange
	}: Props = $props();

	let editorEl = $state<HTMLElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });

	onMount(() => {
		const e = new Editor({
			element: editorEl!,
			extensions,
			content,
			onTransaction: ({ editor }) => {
				editorState = { editor };
				const html = editor.getHTML();
				content = html;
				onchange?.(html);
			}
		});

		editorState = { editor: e };
	});

	onDestroy(() => editorState.editor?.destroy());
</script>

<div class="compote-editor flex flex-col rounded-md border border-border bg-surface-1 {className}">
	{#if editorState.editor}
		<Toolbar {editorState} />
	{/if}
	<div class="editor-content" bind:this={editorEl}></div>
</div>

<style>
	.editor-content :global(.ProseMirror) {
		min-height: 8rem;
		padding: 0.75rem 1rem;
		outline: none;
	}

	.editor-content :global(.ProseMirror p) {
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror h1) {
		font-size: 1.75em;
		font-weight: 700;
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror h2) {
		font-size: 1.4em;
		font-weight: 600;
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror h3) {
		font-size: 1.15em;
		font-weight: 600;
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror ul) {
		list-style-type: disc;
		padding-left: 1.5em;
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror ol) {
		list-style-type: decimal;
		padding-left: 1.5em;
		margin: 0 0 0.5em;
	}

	.editor-content :global(.ProseMirror li) {
		margin-bottom: 0.25em;
	}

	.editor-content :global(.ProseMirror *:last-child) {
		margin-bottom: 0;
	}
</style>
