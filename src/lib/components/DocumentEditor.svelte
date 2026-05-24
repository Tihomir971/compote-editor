<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { cn, ScrollArea } from 'compote-ui';
	import { Editor, type Extensions } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Toolbar from '../Toolbar.svelte';
	import typographyCss from '../print/typography.css?raw';
	import { DOCUMENT_FONT_FACE_CSS } from '../print/embedded-fonts.js';
	import { type PageFormatKey } from '../print/page-formats.js';
	import {
		DocumentPagination,
		type DocumentPaginationOptions
	} from '../extensions/DocumentPagination.js';
	import { PAGE_SIZES, type PageSize } from '../extensions/tiptap-pagination-plus/index.js';

	const FORMAT_TO_PAGE_SIZE: Record<PageFormatKey, PageSize> = {
		A4: PAGE_SIZES.A4,
		Letter: PAGE_SIZES.LETTER
	};

	interface Props {
		extensions?: Extensions;
		content?: string;
		format?: PageFormatKey;
		pagination?: Partial<DocumentPaginationOptions>;
		pageAreaBackground?: string;
		class?: string;
		onUpdate?: (html: string) => void;
		onPrint?: () => void;
	}

	let {
		extensions = [StarterKit],
		content = $bindable(''),
		format = 'A4',
		pagination = {},
		pageAreaBackground = 'var(--color-surface-2, #2f2f2f)',
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
				DocumentPagination.configure({
					pageBreakBackground: 'var(--compote-document-page-area-background)',
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
	class={cn(
		'compote-document-editor flex min-h-0 flex-col rounded-md border border-border bg-surface-1 h-[min(80vh,900px)]',
		className
	)}
>
	{#if editorState.editor}
		<Toolbar {editorState} {onPrint} />
	{/if}
	<ScrollArea.Root class="min-h-0 flex-1">
		<ScrollArea.Viewport>
			<ScrollArea.Content class="min-h-full p-0">
				<div
					class="min-h-full p-6"
					style={`--compote-document-page-area-background: ${pageAreaBackground}; background: ${pageAreaBackground};`}
				>
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
</style>
