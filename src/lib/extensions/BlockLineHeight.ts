import { Extension, getStyleProperty, type CommandProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export type BlockLineHeightOptions = {
	types: string[];
};

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		lineHeight: {
			setLineHeight: (lineHeight: string) => ReturnType;
			unsetLineHeight: () => ReturnType;
		};
	}
}

export const BlockLineHeight = Extension.create<BlockLineHeightOptions>({
	name: 'lineHeight',

	addOptions() {
		return {
			types: ['paragraph', 'heading']
		};
	},

	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					lineHeight: {
						default: null,
						parseHTML: (element) =>
							getStyleProperty(element, 'line-height') ?? element.style.lineHeight,
						renderHTML: (attributes) => {
							if (!attributes.lineHeight) return {};

							return {
								style: `line-height: ${attributes.lineHeight}`
							};
						}
					}
				}
			}
		];
	},

	addCommands() {
		const setBlockLineHeight =
			(lineHeight: string | null) =>
			({ state, tr, dispatch }: CommandProps) => {
				const { selection } = state;
				const types = this.options.types;
				let changed = false;

				function updateNode(pos: number, node: ProseMirrorNode) {
					if (!types.includes(node.type.name)) return;
					if (node.attrs.lineHeight === lineHeight) return;

					tr.setNodeMarkup(pos, undefined, {
						...node.attrs,
						lineHeight
					});
					changed = true;
				}

				if (selection.empty) {
					for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
						const node = selection.$from.node(depth);

						if (types.includes(node.type.name)) {
							updateNode(selection.$from.before(depth), node);
							break;
						}
					}
				} else {
					tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
						if (types.includes(node.type.name)) {
							updateNode(pos, node);
							return false;
						}

						return true;
					});
				}

				if (!changed) return true;

				if (dispatch) dispatch(tr.scrollIntoView());
				return true;
			};

		return {
			setLineHeight: (lineHeight) => setBlockLineHeight(lineHeight),
			unsetLineHeight: () => setBlockLineHeight(null)
		};
	}
});
