<script lang="ts">
	import { Button, Menu, Select, ToggleGroup } from 'compote-ui';
	import type { Editor } from '@tiptap/core';
	import PhArrowCounterClockwise from '~icons/ph/arrow-counter-clockwise';
	import PhArrowClockwise from '~icons/ph/arrow-clockwise';
	import PhTextB from '~icons/ph/text-b';
	import PhTextItalic from '~icons/ph/text-italic';
	import PhTextUnderline from '~icons/ph/text-underline';
	import PhParagraph from '~icons/ph/paragraph';
	import PhTextHOne from '~icons/ph/text-h-one';
	import PhTextHTwo from '~icons/ph/text-h-two';
	import PhTextHThree from '~icons/ph/text-h-three';
	import PhTextAlignLeft from '~icons/ph/text-align-left';
	import PhTextAlignCenter from '~icons/ph/text-align-center';
	import PhTextAlignRight from '~icons/ph/text-align-right';
	import PhTextAlignJustify from '~icons/ph/text-align-justify';
	import PhListBullets from '~icons/ph/list-bullets';
	import PhListNumbers from '~icons/ph/list-numbers';
	import PhFloppyDisk from '~icons/ph/floppy-disk';
	import PhPrinter from '~icons/ph/printer';
	import PhMinus from '~icons/ph/minus';
	import PhTable from '~icons/ph/table';
	import PhScissors from '~icons/ph/scissors';
	import PhTextSubscript from '~icons/ph/text-subscript';
	import PhTextSuperscript from '~icons/ph/text-superscript';

	let {
		editorState,
		onSave,
		isSaving = false,
		onPrint
	}: {
		editorState: { editor: Editor | null };
		onSave?: () => void | Promise<void>;
		isSaving?: boolean;
		onPrint?: () => void;
	} = $props();

	const extensionNames = $derived(
		editorState.editor!.extensionManager.extensions.map((e) => e.name)
	);
	const hasPageBreak = $derived(extensionNames.includes('pageBreak'));
	const hasHorizontalRule = $derived(extensionNames.includes('horizontalRule'));
	const hasTable = $derived(extensionNames.includes('table'));
	const inTable = $derived(hasTable && editorState.editor!.isActive('table'));
	const isTableBorderless = $derived(
		inTable && editorState.editor!.isActive('table', { borderless: true })
	);
	const hasFontSize = $derived(extensionNames.includes('fontSize'));
	const hasBold = $derived(extensionNames.includes('bold'));
	const hasItalic = $derived(extensionNames.includes('italic'));
	const hasUnderline = $derived(extensionNames.includes('underline'));
	const hasSuperscript = $derived(extensionNames.includes('superscript'));
	const hasSubscript = $derived(extensionNames.includes('subscript'));
	const hasHeading = $derived(extensionNames.includes('heading'));
	const hasUndoRedo = $derived(extensionNames.includes('undoRedo'));
	const hasInlineFormatting = $derived(
		hasBold || hasItalic || hasUnderline || hasSuperscript || hasSubscript
	);
	const hasTextAlign = $derived(extensionNames.includes('textAlign'));
	const hasBulletList = $derived(extensionNames.includes('bulletList'));
	const hasOrderedList = $derived(extensionNames.includes('orderedList'));
	const hasLists = $derived(hasBulletList || hasOrderedList);

	const activeAlign = $derived.by(() => {
		for (const align of ['left', 'center', 'right', 'justify'] as const) {
			if (editorState.editor!.isActive({ textAlign: align })) return [align];
		}
		return ['left'];
	});

	// Return arrays (not primitives) so value= prop gets a new reference each re-run
	const activeBlock = $derived.by(() => {
		if (editorState.editor!.isActive('bulletList')) return ['bulletList'];
		if (editorState.editor!.isActive('orderedList')) return ['orderedList'];
		const level = ([1, 2, 3] as const).find((l) =>
			editorState.editor!.isActive('heading', { level: l })
		);
		return level ? [`h${level}`] : ['paragraph'];
	});

	const inlineActive = $derived(
		(['bold', 'italic', 'underline', 'superscript', 'subscript'] as const).filter(
			(mark) => extensionNames.includes(mark) && editorState.editor!.isActive(mark)
		)
	);

	const FONT_SIZE_PTS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
	const FONT_SIZE_ITEMS = FONT_SIZE_PTS.map((n) => ({ value: n + 'pt', label: String(n) }));

	// Base document font size (matches typography.css .document-content font-size)
	const BASE_PT = 11;
	// Effective pt size per block type when no explicit font-size is set (matches em multipliers in typography.css)
	const BLOCK_DEFAULT_PT: Record<string, number> = {
		paragraph: BASE_PT,
		h1: BASE_PT * 2, // 22pt
		h2: BASE_PT * 1.5, // 16.5pt
		h3: BASE_PT * 1.25, // 13.75pt
		h4: BASE_PT // 11pt
	};

	function snapToList(pt: number): string {
		const nearest = FONT_SIZE_PTS.reduce((a, b) => (Math.abs(b - pt) < Math.abs(a - pt) ? b : a));
		return nearest + 'pt';
	}

	const currentFontSize = $derived.by(() => {
		const editor = editorState.editor!;
		const raw = editor.getAttributes('textStyle').fontSize as string | undefined;
		if (raw) return raw;
		const block = Object.keys(BLOCK_DEFAULT_PT).find((type) => {
			if (type.startsWith('h')) return editor.isActive('heading', { level: Number(type[1]) });
			return editor.isActive(type);
		});
		const pt = block ? BLOCK_DEFAULT_PT[block] : BASE_PT;
		return snapToList(pt);
	});

	function ed() {
		return editorState.editor!;
	}
</script>

<div class="flex flex-wrap items-center gap-1 border-b border-border p-1">
	{#if hasUndoRedo}
		<Button
			size="icon"
			variant="ghost"
			aria-label="Undo"
			disabled={!editorState.editor!.can().undo()}
			onclick={() => ed().chain().focus().undo().run()}
		>
			<PhArrowCounterClockwise class="size-6" />
		</Button>
		<Button
			size="icon"
			variant="ghost"
			aria-label="Redo"
			disabled={!editorState.editor!.can().redo()}
			onclick={() => ed().chain().focus().redo().run()}
		>
			<PhArrowClockwise class="size-6" />
		</Button>
		<div class="h-5 w-px bg-border"></div>
	{/if}

	{#if hasHeading}
		<ToggleGroup.Root
			variant="ghost"
			icon
			value={activeBlock}
			onValueChange={({ value }: { value: string[] }) => {
				if (value[0] === 'h1') ed().chain().focus().toggleHeading({ level: 1 }).run();
				else if (value[0] === 'h2') ed().chain().focus().toggleHeading({ level: 2 }).run();
				else if (value[0] === 'h3') ed().chain().focus().toggleHeading({ level: 3 }).run();
				else ed().chain().focus().setParagraph().run();
			}}
		>
			<ToggleGroup.Item value="paragraph"><PhParagraph /></ToggleGroup.Item>
			<ToggleGroup.Item value="h1"><PhTextHOne /></ToggleGroup.Item>
			<ToggleGroup.Item value="h2"><PhTextHTwo /></ToggleGroup.Item>
			<ToggleGroup.Item value="h3"><PhTextHThree /></ToggleGroup.Item>
		</ToggleGroup.Root>
	{/if}

	{#if hasHeading && hasLists}
		<div class="h-5 w-px bg-border"></div>
	{/if}

	{#if hasLists}
		<ToggleGroup.Root
			variant="ghost"
			icon
			value={activeBlock}
			onValueChange={({ value }: { value: string[] }) => {
				if (value[0] === 'bulletList') ed().chain().focus().toggleBulletList().run();
				else if (value[0] === 'orderedList') ed().chain().focus().toggleOrderedList().run();
				else ed().chain().focus().setParagraph().run();
			}}
		>
			{#if hasBulletList}
				<ToggleGroup.Item value="bulletList"><PhListBullets /></ToggleGroup.Item>
			{/if}
			{#if hasOrderedList}
				<ToggleGroup.Item value="orderedList"><PhListNumbers /></ToggleGroup.Item>
			{/if}
		</ToggleGroup.Root>
	{/if}

	{#if hasTextAlign}
		{#if hasHeading || hasLists || hasInlineFormatting}
			<div class="h-5 w-px bg-border"></div>
		{/if}
		<ToggleGroup.Root
			variant="ghost"
			icon
			value={activeAlign}
			onValueChange={({ value }) => {
				if (value[0]) ed().chain().focus().setTextAlign(value[0]).run();
				else ed().chain().focus().unsetTextAlign().run();
			}}
			class="border-none"
		>
			<ToggleGroup.Item value="left"><PhTextAlignLeft /></ToggleGroup.Item>
			<ToggleGroup.Item value="center"><PhTextAlignCenter /></ToggleGroup.Item>
			<ToggleGroup.Item value="right"><PhTextAlignRight /></ToggleGroup.Item>
			<ToggleGroup.Item value="justify"><PhTextAlignJustify /></ToggleGroup.Item>
		</ToggleGroup.Root>
	{/if}

	{#if hasInlineFormatting}
		{#if hasHeading || hasLists || hasTextAlign}
			<div class="h-5 w-px bg-border"></div>
		{/if}
		<ToggleGroup.Root
			variant="ghost"
			icon
			multiple
			value={inlineActive}
			onValueChange={({ value }: { value: string[] }) => {
				const chain = ed().chain().focus();
				if (hasBold && value.includes('bold') !== ed().isActive('bold')) chain.toggleBold();
				if (hasItalic && value.includes('italic') !== ed().isActive('italic')) chain.toggleItalic();
				if (hasUnderline && value.includes('underline') !== ed().isActive('underline'))
					chain.toggleUnderline();
				if (hasSuperscript && value.includes('superscript') !== ed().isActive('superscript'))
					chain.toggleSuperscript();
				if (hasSubscript && value.includes('subscript') !== ed().isActive('subscript'))
					chain.toggleSubscript();
				chain.run();
			}}
		>
			{#if hasBold}
				<ToggleGroup.Item value="bold"><PhTextB /></ToggleGroup.Item>
			{/if}
			{#if hasItalic}
				<ToggleGroup.Item value="italic"><PhTextItalic /></ToggleGroup.Item>
			{/if}
			{#if hasUnderline}
				<ToggleGroup.Item value="underline"><PhTextUnderline /></ToggleGroup.Item>
			{/if}
			{#if hasSuperscript}
				<ToggleGroup.Item value="superscript"><PhTextSuperscript /></ToggleGroup.Item>
			{/if}
			{#if hasSubscript}
				<ToggleGroup.Item value="subscript"><PhTextSubscript /></ToggleGroup.Item>
			{/if}
		</ToggleGroup.Root>
	{/if}

	{#if hasFontSize}
		{#if hasHeading || hasLists || hasTextAlign || hasInlineFormatting}
			<div class="h-5 w-px bg-border"></div>
		{/if}
		<div class="w-20">
			<Select
				items={FONT_SIZE_ITEMS}
				value={currentFontSize}
				size="sm"
				placeholder="Size"
				onValueChange={({ value }) => {
					if (value[0]) ed().chain().focus().setFontSize(value[0]).run();
					else ed().chain().focus().unsetFontSize().run();
				}}
			/>
		</div>
	{/if}

	{#if hasTable}
		<div class="h-5 w-px bg-border"></div>
		<Menu.Root
			onSelect={({ value }: { value: string }) => {
				const chain = ed().chain().focus();
				if (value === 'toggle-borders') {
					ed().chain().focus().toggleTableBorderless().run();
					return;
				}
				if (value === 'insert') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
				else if (value === 'col-before') chain.addColumnBefore();
				else if (value === 'col-after') chain.addColumnAfter();
				else if (value === 'col-delete') chain.deleteColumn();
				else if (value === 'row-before') chain.addRowBefore();
				else if (value === 'row-after') chain.addRowAfter();
				else if (value === 'row-delete') chain.deleteRow();
				else if (value === 'merge') chain.mergeCells();
				else if (value === 'split') chain.splitCell();
				else if (value === 'delete-table') chain.deleteTable();
				chain.run();
			}}
		>
			<Menu.Trigger variant="ghost" size="icon"><PhTable class="size-6" /></Menu.Trigger>
			<Menu.Content>
				<Menu.Item value="insert">Insert table</Menu.Item>
				{#if inTable}
					<Menu.Separator />
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel>Column</Menu.ItemGroupLabel>
						<Menu.Item value="col-before">Add column before</Menu.Item>
						<Menu.Item value="col-after">Add column after</Menu.Item>
						<Menu.Item value="col-delete">Delete column</Menu.Item>
					</Menu.ItemGroup>
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel>Row</Menu.ItemGroupLabel>
						<Menu.Item value="row-before">Add row before</Menu.Item>
						<Menu.Item value="row-after">Add row after</Menu.Item>
						<Menu.Item value="row-delete">Delete row</Menu.Item>
					</Menu.ItemGroup>
					<Menu.Separator />
					<Menu.Item value="merge">Merge cells</Menu.Item>
					<Menu.Item value="split">Split cell</Menu.Item>
					<Menu.Separator />
					<Menu.Item value="toggle-borders"
						>{isTableBorderless ? 'Show borders' : 'Hide borders'}</Menu.Item
					>
					<Menu.Separator />
					<Menu.Item value="delete-table">Delete table</Menu.Item>
				{/if}
			</Menu.Content>
		</Menu.Root>
	{/if}

	{#if hasHorizontalRule || hasPageBreak}
		<div class="h-5 w-px bg-border"></div>
		{#if hasHorizontalRule}
			<Button
				size="icon"
				variant="ghost"
				aria-label="Insert horizontal rule"
				onclick={() => ed().chain().focus().setHorizontalRule().run()}
			>
				<PhMinus class="size-6" />
			</Button>
		{/if}
		{#if hasPageBreak}
			<Button
				size="icon"
				variant="ghost"
				aria-label="Insert page break"
				onclick={() => ed().chain().focus().insertPageBreak().run()}
			>
				<PhScissors class="size-6" />
			</Button>
		{/if}
	{/if}

	{#if onSave || onPrint}
		<div class="ml-auto flex items-center gap-1">
			<div class="h-5 w-px bg-border"></div>
			{#if onSave}
				<Button size="icon" variant="ghost" aria-label="Save" disabled={isSaving} onclick={onSave}>
					<PhFloppyDisk class="size-6" />
				</Button>
			{/if}
			{#if onPrint}
				<Button size="icon" variant="ghost" aria-label="Print" onclick={onPrint}>
					<PhPrinter class="size-6" />
				</Button>
			{/if}
		</div>
	{/if}
</div>
