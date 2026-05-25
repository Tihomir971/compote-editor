import { mergeAttributes, Node, type RawCommands } from '@tiptap/core';
import type { TemplateVariableDefinition } from '../template-variables.js';

export type TemplateVariableAttributes = Pick<TemplateVariableDefinition, 'id' | 'label'>;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		templateVariable: {
			insertTemplateVariable: (attrs: TemplateVariableAttributes) => ReturnType;
		};
	}
}

export const TemplateVariable = Node.create({
	name: 'templateVariable',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			id: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-template-variable-id'),
				renderHTML: (attrs) => ({ 'data-template-variable-id': attrs.id })
			},
			label: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-template-variable-label'),
				renderHTML: (attrs) => ({ 'data-template-variable-label': attrs.label })
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-type="template-variable"]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'template-variable',
				class: 'template-variable',
				contenteditable: 'false'
			}),
			node.attrs.label
		];
	},

	addCommands() {
		return {
			insertTemplateVariable:
				(attrs: TemplateVariableAttributes) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs })
		} satisfies Partial<RawCommands>;
	}
});
