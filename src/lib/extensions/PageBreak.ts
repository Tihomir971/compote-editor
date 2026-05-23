import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		pageBreak: {
			insertPageBreak: () => ReturnType;
		};
	}
}

export const PageBreak = Node.create({
	name: 'pageBreak',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	parseHTML() {
		return [{ tag: 'div[data-type="page-break"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break' })];
	},

	addCommands() {
		return {
			insertPageBreak:
				() =>
				({ commands }) =>
					commands.insertContent({ type: this.name })
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Enter': () => this.editor.commands.insertPageBreak()
		};
	}
});
