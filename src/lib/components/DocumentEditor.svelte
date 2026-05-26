<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { cn, ScrollArea } from 'compote-ui';
	import { Editor, type Extensions, type JSONContent } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TextAlign from '@tiptap/extension-text-align';
	import { FontSize, TextStyle } from '@tiptap/extension-text-style';
	import Superscript from '@tiptap/extension-superscript';
	import Subscript from '@tiptap/extension-subscript';
	import { TableKit } from '@tiptap/extension-table';
	import { BorderlessTable } from '../extensions/BorderlessTable.js';
	import Toolbar from './Toolbar.svelte';
	import typographyCss from '../print/typography.css?raw';
	import { DOCUMENT_FONT_FACE_CSS } from '../print/embedded-fonts.js';
	import { type PageFormatKey } from '../print/page-formats.js';
	import { printWithPagedJs } from '../print/print-with-pagedjs.js';
	import { PageBreak } from '../extensions/PageBreak.js';
	import { TemplateVariable } from '../extensions/TemplateVariable.js';
	import { DocumentPagination } from '../extensions/DocumentPagination.js';
	import { BlockLineHeight } from '../extensions/BlockLineHeight.js';
	import { PAGE_SIZES, type PageSize } from '../extensions/page-sizes.js';
	import { SvelteMap } from 'svelte/reactivity';
	import type {
		DocumentEditorCommonProps,
		DocumentEditorContentFormat,
		DocumentEditorMode
	} from '../document-editor-options.js';

	const FORMAT_TO_PAGE_SIZE: Record<PageFormatKey, PageSize> = {
		A4: PAGE_SIZES.A4,
		Letter: PAGE_SIZES.LETTER
	};

	const DEFAULT_EXTENSIONS: Extensions = [
		StarterKit,
		TextAlign.configure({ types: ['heading', 'paragraph'] }),
		TextStyle,
		FontSize,
		BlockLineHeight,
		Superscript,
		Subscript,
		TableKit.configure({ table: false }),
		BorderlessTable.configure({ resizable: true }),
		PageBreak,
		TemplateVariable
	];

	type HtmlEditorProps = DocumentEditorCommonProps & {
		mode?: Exclude<DocumentEditorMode, 'template'>;
		contentFormat?: 'html';
		content?: string;
	};

	type TemplateEditorProps = DocumentEditorCommonProps & {
		mode: 'template';
		contentFormat?: 'json';
		content?: JSONContent;
	};

	type JsonReadonlyEditorProps = DocumentEditorCommonProps & {
		mode: 'readonly';
		contentFormat: 'json';
		content?: JSONContent;
	};

	type Props = HtmlEditorProps | TemplateEditorProps | JsonReadonlyEditorProps;

	let {
		extensions = [],
		content = $bindable(''),
		mode = 'editor',
		contentFormat,
		page = {},
		classes = {},
		template = {},
		onUpdate,
		onSave,
		onPrint
	}: Props = $props();

	let editorEl = $state<HTMLElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let isSaving = $state(false);
	let resolvedContentFormat = $derived<DocumentEditorContentFormat>(
		contentFormat ?? (mode === 'template' ? 'json' : 'html')
	);

	const STYLE_ID = 'compote-document-css';

	function resolveExtensions(extensions: Extensions): Extensions {
		const extensionMap = new SvelteMap(
			DEFAULT_EXTENSIONS.map((extension) => [extension.name, extension])
		);

		for (const extension of extensions) {
			extensionMap.set(extension.name, extension);
		}

		return [...extensionMap.values()];
	}

	onMount(() => {
		if (!document.getElementById(STYLE_ID)) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = DOCUMENT_FONT_FACE_CSS + '\n' + typographyCss;
			document.head.appendChild(style);
		}

		const pageSize = FORMAT_TO_PAGE_SIZE[page.format ?? 'A4'] ?? PAGE_SIZES.A4;

		const e = new Editor({
			element: editorEl!,
			extensions: [
				...resolveExtensions(extensions),
				DocumentPagination.configure({
					pageGapClass: classes.pageArea ?? 'bg-surface-2',
					pageGap: 20,
					...(page.pagination ?? {}),
					...pageSize
				})
			],
			content,
			editorProps: {
				attributes: { class: 'document-content' }
			},
			editable: mode !== 'readonly',
			onTransaction: ({ editor }) => {
				editorState = { editor };
				const html = editor.getHTML();
				const json = editor.getJSON();
				const nextContent = resolvedContentFormat === 'json' ? json : html;
				content = nextContent;
				onUpdate?.({ content: nextContent, html, json, editor });
			}
		});

		editorState = { editor: e };
	});

	$effect(() => {
		const currentFormat = page.format ?? 'A4';
		untrack(() => {
			const editor = editorState.editor;
			if (editor) {
				editor.commands.updatePageSize(FORMAT_TO_PAGE_SIZE[currentFormat] ?? PAGE_SIZES.A4);
			}
		});
	});

	function handlePrint() {
		if (onPrint) {
			onPrint();
			return;
		}

		const printContent =
			editorState.editor?.getHTML() ?? (typeof content === 'string' ? content : '');
		printWithPagedJs({ content: printContent, format: page.format ?? 'A4' });
	}

	async function handleSave() {
		const editor = editorState.editor;

		if (!onSave || !editor || isSaving) return;

		isSaving = true;
		try {
			await onSave({
				content,
				html: editor.getHTML(),
				json: editor.getJSON(),
				editor
			});
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!onSave || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;

		event.preventDefault();
		void handleSave();
	}

	onDestroy(() => editorState.editor?.destroy());
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class={cn(
		'flex min-h-0 flex-col rounded-md border border-border bg-surface-1 h-[min(80vh,900px)]',
		classes.root
	) ?? ''}
>
	{#if editorState.editor}
		<Toolbar
			{editorState}
			onSave={onSave ? handleSave : undefined}
			{isSaving}
			onPrint={handlePrint}
			templateFields={mode === 'readonly' ? [] : (template.fields ?? [])}
		/>
	{/if}
	<ScrollArea.Root class="min-h-0 flex-1">
		<ScrollArea.Viewport>
			<ScrollArea.Content class="min-h-full p-0">
				<div class={cn('min-h-full p-6', classes.pageArea ?? 'bg-surface-2') ?? ''}>
					<div class="flex min-w-max justify-center">
						<div bind:this={editorEl}></div>
					</div>
				</div>
			</ScrollArea.Content>
		</ScrollArea.Viewport>
		<ScrollArea.Scrollbar orientation="vertical">
			<ScrollArea.Thumb />
		</ScrollArea.Scrollbar>
		<ScrollArea.Scrollbar orientation="horizontal">
			<ScrollArea.Thumb />
		</ScrollArea.Scrollbar>
		<ScrollArea.Corner />
	</ScrollArea.Root>
</div>

<style>
	:global(.cdp-with-pagination p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #aaa;
		pointer-events: none;
		height: 0;
	}

	:global(.document-content .template-variable) {
		display: inline-flex;
		max-width: 100%;
		align-items: baseline;
		border: 1px solid color-mix(in oklab, currentColor 24%, transparent);
		border-radius: 4px;
		background: color-mix(in oklab, currentColor 8%, transparent);
		padding: 0 0.35em;
		font: inherit;
		line-height: 1.55;
		white-space: nowrap;
	}

	:global(.document-content .template-variable::before) {
		content: '[';
		opacity: 0.65;
	}

	:global(.document-content .template-variable::after) {
		content: ']';
		opacity: 0.65;
	}
</style>
