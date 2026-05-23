<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { Editor, type Extensions } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Toolbar from '../Toolbar.svelte';
	import typographyCss from '../print/typography.css?raw';
	import { DOCUMENT_FONT_FACE_CSS } from '../print/embedded-fonts.js';
	import { type PageFormatKey } from '../print/page-formats.js';
	import {
		PaginationPlus,
		PAGE_SIZES,
		type PaginationPlusOptions,
		type PageSize
	} from '../extensions/tiptap-pagination-plus/index.js';

	const FORMAT_TO_PAGE_SIZE: Record<PageFormatKey, PageSize> = {
		A4: PAGE_SIZES.A4,
		Letter: PAGE_SIZES.LETTER
	};

	interface Props {
		extensions?: Extensions;
		content?: string;
		format?: PageFormatKey;
		pagination?: Partial<PaginationPlusOptions>;
		class?: string;
		onUpdate?: (html: string) => void;
		onPrint?: () => void;
	}

	let {
		extensions = [StarterKit],
		content = $bindable(''),
		format = 'A4',
		pagination = {},
		class: className = '',
		onUpdate,
		onPrint
	}: Props = $props();

	let editorEl = $state<HTMLElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });

	const STYLE_ID = 'compote-document-css';

	onMount(() => {
		if (!document.getElementById(STYLE_ID)) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = DOCUMENT_FONT_FACE_CSS + '\n' + typographyCss;
			document.head.appendChild(style);
		}

		const pageSize = FORMAT_TO_PAGE_SIZE[format] ?? PAGE_SIZES.A4;

		const e = new Editor({
			element: editorEl!,
			extensions: [
				...extensions,
				PaginationPlus.configure({
					contentMarginTop: 0,
					contentMarginBottom: 0,
					footerRight: '',
					pageBreakBackground: 'var(--color-surface-2)',
					pageGap: 20,
					...pagination,
					...pageSize
				})
			],
			content,
			editorProps: {
				attributes: { class: 'document-content' }
			},
			onTransaction: ({ editor }) => {
				editorState = { editor };
				const html = editor.getHTML();
				content = html;
				onUpdate?.(html);
			}
		});

		editorState = { editor: e };
	});

	$effect(() => {
		const currentFormat = format;
		untrack(() => {
			const editor = editorState.editor;
			if (editor) {
				editor.commands.updatePageSize(FORMAT_TO_PAGE_SIZE[currentFormat] ?? PAGE_SIZES.A4);
			}
		});
	});

	onDestroy(() => editorState.editor?.destroy());
</script>

<div
	class="compote-document-editor flex flex-col rounded-md border border-border bg-surface-1 {className}"
>
	{#if editorState.editor}
		<Toolbar {editorState} {onPrint} />
	{/if}
	<div class="flex justify-center overflow-auto bg-surface-2 p-6">
		<div bind:this={editorEl}></div>
	</div>
</div>

<style>
	:global(.rm-with-pagination) {
		outline: none;
		min-height: 4em;
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}

	:global(.rm-with-pagination p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #aaa;
		pointer-events: none;
		height: 0;
	}
</style>
