import { Extension, type CommandProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import { cn } from 'compote-ui';
import { getPageSize, type PageSize } from '../page-geometry.js';

export interface DocumentPaginationOptions {
	enabled: boolean;
	pageHeight: number;
	pageWidth: number;
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
	pageGap: number;
	pageGapClass: string;
	pageGapBorderColor: string;
}

interface PageWidget {
	pos: number;
	fillerHeight: number;
	manual: boolean;
	/**
	 * When greater than zero the break falls between two table rows, so the filler has to be
	 * rendered as a `<tr>` spanning this many columns — a `<div>` would be hoisted out of the
	 * table by the HTML parser.
	 */
	columns: number;
}

interface BreakCandidate {
	/** Document position the page-break widget is inserted at. */
	pos: number;
	nodeSize: number;
	typeName: string;
	element: HTMLElement;
	/** Columns to span when this candidate sits inside a table; zero at the top level. */
	columns: number;
}

interface PaginationPluginState {
	decorations: DecorationSet;
	measured: boolean;
}

const defaultOptions: DocumentPaginationOptions = {
	enabled: true,
	...getPageSize(),
	pageGap: 20,
	pageGapClass: '',
	pageGapBorderColor: '#e5e5e5'
};

const paginationKey = new PluginKey<PaginationPluginState>('documentPagination');
const remeasureMetaKey = 'DOCUMENT_PAGINATION_REMEASURE';
const measuredMetaKey = 'DOCUMENT_PAGINATION_MEASURED';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		DocumentPagination: {
			updatePageSize: (size: PageSize) => ReturnType;
			updatePageHeight: (height: number) => ReturnType;
			updatePageWidth: (width: number) => ReturnType;
			updatePageGap: (gap: number) => ReturnType;
			updateMargins: (margins: {
				top: number;
				bottom: number;
				left: number;
				right: number;
			}) => ReturnType;
			togglePagination: () => ReturnType;
			enablePagination: () => ReturnType;
			disablePagination: () => ReturnType;
		};
	}

	interface Storage {
		DocumentPagination: DocumentPaginationOptions;
	}
}

const applyCssVariables = (targetNode: HTMLElement, options: DocumentPaginationOptions) => {
	const variables = {
		'cdp-page-height': `${options.pageHeight}px`,
		'cdp-page-width': `${options.pageWidth}px`,
		'cdp-margin-top': `${options.marginTop}px`,
		'cdp-margin-bottom': `${options.marginBottom}px`,
		'cdp-margin-left': `${options.marginLeft}px`,
		'cdp-margin-right': `${options.marginRight}px`,
		'cdp-page-gap': `${options.pageGap}px`,
		'cdp-page-gap-border-color': options.pageGapBorderColor
	};

	Object.entries(variables).forEach(([key, value]) => {
		targetNode.style.setProperty(`--${key}`, value);
	});
};

const applyEditorStyles = (targetNode: HTMLElement, options: DocumentPaginationOptions) => {
	targetNode.classList.add('cdp-with-pagination');
	targetNode.style.boxSizing = 'border-box';
	targetNode.style.width = `var(--cdp-page-width)`;
	targetNode.style.paddingTop = `var(--cdp-margin-top)`;
	targetNode.style.paddingRight = `var(--cdp-margin-right)`;
	targetNode.style.paddingBottom = `var(--cdp-margin-bottom)`;
	targetNode.style.paddingLeft = `var(--cdp-margin-left)`;
	targetNode.style.border = 'none';
	applyCssVariables(targetNode, options);
};

const ensureStyleElement = () => {
	if (document.querySelector('style[data-document-pagination-style]')) {
		return;
	}

	const style = document.createElement('style');
	style.dataset.documentPaginationStyle = '';
	style.textContent = `
    .cdp-with-pagination {
      outline: none;
      min-height: var(--cdp-page-height);
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .cdp-page-widget {
      display: block;
      clear: both;
      pointer-events: none;
    }

    .cdp-page-widget-row {
      display: table-row;
    }

    /* The filler cell must not inherit the document's cell borders or padding. */
    .cdp-page-widget-cell {
      padding: 0 !important;
      border: none !important;
      background: none !important;
      box-shadow: none !important;
    }

    /*
     * The table wrapper scrolls horizontally, which clips the page gap where it bleeds out to
     * the page edges. A table carrying a page break opts out of that clipping so its gap looks
     * like every other one; tables without a break keep their scrolling.
     */
    .cdp-with-pagination .tableWrapper:has(.cdp-page-widget-row) {
      overflow-x: visible;
    }

    .cdp-page-fill {
      height: var(--cdp-page-fill-height);
      background: white;
    }

    .cdp-page-gap {
      height: var(--cdp-page-gap);
      margin-left: calc(-1 * var(--cdp-margin-left));
      margin-right: calc(-1 * var(--cdp-margin-right));
    }

    .cdp-next-page-margin {
      height: var(--cdp-margin-top);
      background: white;
    }

    .cdp-with-pagination div[data-type='page-break'] {
      height: 0;
      margin: 0 !important;
      overflow: hidden;
      background: none;
    }
  `;
	document.head.appendChild(style);
};

const getContentHeight = (options: DocumentPaginationOptions) => {
	return Math.max(1, options.pageHeight - options.marginTop - options.marginBottom);
};

const countColumns = (row: HTMLElement) =>
	Array.from(row.children).reduce(
		(total, cell) => total + ((cell as HTMLTableCellElement).colSpan || 1),
		0
	);

/**
 * Rows of a table, as individually breakable units. Breaking before the first row is the same
 * as breaking before the table itself, so that candidate keeps the table's own position and is
 * rendered as an ordinary block widget.
 */
const getTableRowCandidates = (
	view: EditorView,
	table: ProseMirrorNode,
	tablePos: number
): BreakCandidate[] => {
	const candidates: BreakCandidate[] = [];
	let offset = tablePos + 1;

	table.forEach((row) => {
		const rowPos = offset;
		offset += row.nodeSize;

		const element = view.nodeDOM(rowPos);
		if (!(element instanceof HTMLElement)) {
			return;
		}

		const first = candidates.length === 0;
		candidates.push({
			pos: first ? tablePos : rowPos,
			nodeSize: row.nodeSize,
			typeName: row.type.name,
			element,
			columns: first ? 0 : countColumns(element)
		});
	});

	return candidates;
};

const getBreakCandidates = (view: EditorView) => {
	const candidates: BreakCandidate[] = [];

	view.state.doc.forEach((node, pos) => {
		const element = view.nodeDOM(pos);
		if (!(element instanceof HTMLElement)) {
			return;
		}

		if (node.type.name === 'table') {
			const rows = getTableRowCandidates(view, node, pos);
			if (rows.length) {
				candidates.push(...rows);
				return;
			}
		}

		candidates.push({
			pos,
			nodeSize: node.nodeSize,
			typeName: node.type.name,
			element,
			columns: 0
		});
	});

	return candidates;
};

const measurePageWidgets = (view: EditorView, options: DocumentPaginationOptions): PageWidget[] => {
	if (!options.enabled) {
		return [];
	}

	const blocks = getBreakCandidates(view);
	if (!blocks.length) {
		return [];
	}

	const contentHeight = getContentHeight(options);
	const widgets: PageWidget[] = [];
	let cursor = 0;
	let previousBottom: number | undefined;

	for (const block of blocks) {
		// Kept fractional on purpose: rounding each block up drifts by up to a pixel per block,
		// which across a long table is enough to move a page break by a whole row relative to
		// print, where the same geometry is measured exactly.
		const rect = block.element.getBoundingClientRect();
		const gapBefore = previousBottom === undefined ? 0 : Math.max(0, rect.top - previousBottom);
		const blockHeight = Math.max(0, rect.height);

		if (block.typeName === 'pageBreak') {
			const fillerHeight = Math.max(0, contentHeight - cursor) + options.marginBottom;
			widgets.push({
				pos: block.pos + block.nodeSize,
				fillerHeight,
				manual: true,
				columns: 0
			});
			cursor = 0;
			previousBottom = rect.bottom;
			continue;
		}

		const requiredHeight = gapBefore + blockHeight;
		if (cursor > 0 && cursor + requiredHeight > contentHeight) {
			const fillerHeight = Math.max(0, contentHeight - cursor) + options.marginBottom;
			widgets.push({
				pos: block.pos,
				fillerHeight,
				manual: false,
				columns: block.columns
			});
			cursor = blockHeight;
		} else {
			cursor += requiredHeight;
		}

		previousBottom = rect.bottom;
	}

	return widgets;
};

const buildDecorationSet = (
	view: EditorView,
	options: DocumentPaginationOptions,
	widgets: PageWidget[]
) => {
	const buildParts = (widget: PageWidget) => {
		const fill = document.createElement('div');
		fill.classList.add('cdp-page-fill');
		fill.style.setProperty('--cdp-page-fill-height', `${widget.fillerHeight}px`);

		const gap = document.createElement('div');
		gap.className = cn('cdp-page-gap', options.pageGapClass) ?? '';

		const nextPageMargin = document.createElement('div');
		nextPageMargin.classList.add('cdp-next-page-margin');

		return [fill, gap, nextPageMargin];
	};

	const decorations = widgets.map((widget, index) => {
		return Decoration.widget(
			widget.pos,
			() => {
				if (widget.columns > 0) {
					const row = document.createElement('tr');
					row.classList.add('cdp-page-widget', 'cdp-page-widget-row');
					row.dataset.pageWidget = 'auto';
					row.dataset.pageWidgetIndex = String(index);

					const cell = document.createElement('td');
					cell.colSpan = widget.columns;
					cell.classList.add('cdp-page-widget-cell');
					cell.append(...buildParts(widget));

					row.appendChild(cell);
					return row;
				}

				const el = document.createElement('div');
				el.classList.add('cdp-page-widget');
				el.dataset.pageWidget = widget.manual ? 'manual' : 'auto';
				el.dataset.pageWidgetIndex = String(index);
				el.append(...buildParts(widget));
				return el;
			},
			{ side: widget.manual ? 1 : -1 }
		);
	});

	return DecorationSet.create(view.state.doc, decorations);
};

export const DocumentPagination = Extension.create<
	DocumentPaginationOptions,
	DocumentPaginationOptions
>({
	name: 'DocumentPagination',

	addOptions() {
		return defaultOptions;
	},

	addStorage() {
		return { ...defaultOptions };
	},

	onCreate() {
		Object.assign(this.storage, this.options);
		ensureStyleElement();
		applyEditorStyles(this.editor.view.dom, { ...this.options, ...this.storage });
	},

	onDestroy() {
		this.editor.view.dom.classList.remove('cdp-with-pagination');
	},

	addProseMirrorPlugins() {
		const storage = this.storage;

		return [
			new Plugin<PaginationPluginState>({
				key: paginationKey,

				state: {
					init: (_, state) => ({
						decorations: DecorationSet.empty.find().length
							? DecorationSet.empty
							: DecorationSet.create(state.doc, []),
						measured: false
					}),

					apply: (tr, pluginState) => {
						const measured = tr.getMeta(measuredMetaKey) as DecorationSet | undefined;
						if (measured) {
							return { decorations: measured, measured: true };
						}

						if (tr.docChanged || tr.getMeta(remeasureMetaKey)) {
							return { decorations: DecorationSet.create(tr.doc, []), measured: false };
						}

						return {
							decorations: pluginState.decorations.map(tr.mapping, tr.doc),
							measured: pluginState.measured
						};
					}
				},

				props: {
					decorations(state) {
						return paginationKey.getState(state)?.decorations ?? DecorationSet.empty;
					}
				},

				view: (view) => {
					let queued = false;
					let destroyed = false;

					const requestMeasure = () => {
						if (queued) {
							return;
						}
						queued = true;
						requestAnimationFrame(() => {
							queued = false;
							if (destroyed) {
								return;
							}

							const pluginState = paginationKey.getState(view.state);
							if (!pluginState || pluginState.measured) {
								return;
							}

							const options = { ...this.options, ...storage };
							applyEditorStyles(view.dom, options);
							const widgets = measurePageWidgets(view, options);
							const decorations = buildDecorationSet(view, options, widgets);
							view.dispatch(view.state.tr.setMeta(measuredMetaKey, decorations));
						});
					};

					const requestRemeasure = () => {
						if (destroyed) {
							return;
						}

						const pluginState = paginationKey.getState(view.state);
						if (pluginState?.measured) {
							view.dispatch(view.state.tr.setMeta(remeasureMetaKey, true));
						}

						requestMeasure();
					};

					const requestSettledLayoutMeasure = () => {
						requestAnimationFrame(() => {
							requestAnimationFrame(requestRemeasure);
						});
					};

					requestMeasure();
					requestSettledLayoutMeasure();
					document.fonts?.ready.then(requestRemeasure);

					return {
						update: () => {
							const pluginState = paginationKey.getState(view.state);
							if (!pluginState?.measured) {
								requestMeasure();
							}
						},
						destroy: () => {
							destroyed = true;
						}
					};
				}
			})
		];
	},

	addCommands() {
		const update = (next: Partial<DocumentPaginationOptions>) => {
			return ({ tr, dispatch }: CommandProps) => {
				Object.assign(this.storage, next);
				dispatch?.(tr.setMeta(remeasureMetaKey, true));
				return true;
			};
		};

		return {
			updatePageSize: (size: PageSize) =>
				update({
					pageHeight: size.pageHeight,
					pageWidth: size.pageWidth,
					marginTop: size.marginTop,
					marginBottom: size.marginBottom,
					marginLeft: size.marginLeft,
					marginRight: size.marginRight
				}),
			updatePageHeight: (height: number) => update({ pageHeight: height }),
			updatePageWidth: (width: number) => update({ pageWidth: width }),
			updatePageGap: (gap: number) => update({ pageGap: gap }),
			updateMargins: (margins: { top: number; bottom: number; left: number; right: number }) =>
				update({
					marginTop: margins.top,
					marginBottom: margins.bottom,
					marginLeft: margins.left,
					marginRight: margins.right
				}),
			togglePagination: () => update({ enabled: !this.storage.enabled }),
			enablePagination: () => update({ enabled: true }),
			disablePagination: () => update({ enabled: false })
		};
	}
});
