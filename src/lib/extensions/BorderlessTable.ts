import { Table, TableView } from '@tiptap/extension-table';
import type { Node } from '@tiptap/pm/model';

class BorderlessTableView extends TableView {
	constructor(node: Node, cellMinWidth: number) {
		super(node, cellMinWidth);
		this.table.classList.toggle('no-border', !!node.attrs.borderless);
	}

	update(node: Node) {
		const result = super.update(node);
		if (result) this.table.classList.toggle('no-border', !!node.attrs.borderless);
		return result;
	}
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		borderlessTable: {
			toggleTableBorderless: () => ReturnType;
		};
	}
}

export const BorderlessTable = Table.extend({
	addOptions() {
		return { ...this.parent!(), View: BorderlessTableView };
	},
	addAttributes() {
		return {
			...this.parent?.(),
			borderless: {
				default: false,
				parseHTML: (el) => el.classList.contains('no-border'),
				renderHTML: (attrs) => (attrs.borderless ? { class: 'no-border' } : {})
			}
		};
	},

	addCommands() {
		return {
			...this.parent?.(),
			toggleTableBorderless:
				() =>
				({ tr, state, dispatch }) => {
					const { $from } = state.selection;
					for (let d = $from.depth; d > 0; d--) {
						const node = $from.node(d);
						if (node.type.name === 'table') {
							if (dispatch) {
								const pos = $from.before(d);
								tr.setNodeMarkup(pos, undefined, {
									...node.attrs,
									borderless: !node.attrs.borderless
								});
								dispatch(tr);
							}
							return true;
						}
					}
					return false;
				}
		};
	}
});
