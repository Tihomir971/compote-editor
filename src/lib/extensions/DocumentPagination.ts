import { Extension, type CommandProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import type { PageSize } from './tiptap-pagination-plus/constants';

export interface DocumentPaginationOptions {
	enabled: boolean;
	pageHeight: number;
	pageWidth: number;
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
	pageGap: number;
	pageBreakBackground: string;
	pageGapBorderColor: string;
}

interface PageWidget {
	pos: number;
	fillerHeight: number;
	manual: boolean;
}

interface PaginationPluginState {
	decorations: DecorationSet;
	measured: boolean;
}

const defaultOptions: DocumentPaginationOptions = {
	enabled: true,
	pageHeight: 800,
	pageWidth: 789,
	marginTop: 20,
	marginBottom: 20,
	marginLeft: 50,
	marginRight: 50,
	pageGap: 50,
	pageBreakBackground: '#ffffff',
	pageGapBorderColor: '#e5e5e5'
};

const paginationKey = new PluginKey<PaginationPluginState>('documentPagination');
const remeasureMetaKey = 'DOCUMENT_PAGINATION_REMEASURE';
const measuredMetaKey = 'DOCUMENT_PAGINATION_MEASURED';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		DocumentPagination: {
			updatePageBreakBackground: (color: string) => ReturnType;
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

const getAncestorBackground = (targetNode: HTMLElement) => {
	let element = targetNode.parentElement;

	while (element) {
		const backgroundColor = getComputedStyle(element).backgroundColor;
		if (
			backgroundColor &&
			backgroundColor !== 'transparent' &&
			backgroundColor !== 'rgba(0, 0, 0, 0)'
		) {
			return backgroundColor;
		}
		element = element.parentElement;
	}

	return defaultOptions.pageBreakBackground;
};

const applyCssVariables = (targetNode: HTMLElement, options: DocumentPaginationOptions) => {
	const pageBreakBackground =
		options.pageBreakBackground === 'auto'
			? getAncestorBackground(targetNode)
			: options.pageBreakBackground;
	const variables = {
		'cdp-page-height': `${options.pageHeight}px`,
		'cdp-page-width': `${options.pageWidth}px`,
		'cdp-margin-top': `${options.marginTop}px`,
		'cdp-margin-bottom': `${options.marginBottom}px`,
		'cdp-margin-left': `${options.marginLeft}px`,
		'cdp-margin-right': `${options.marginRight}px`,
		'cdp-page-gap': `${options.pageGap}px`,
		'cdp-page-break-background': pageBreakBackground,
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

    .cdp-page-fill {
      height: var(--cdp-page-fill-height);
      background: white;
    }

    .cdp-page-gap {
      height: var(--cdp-page-gap);
      margin-left: calc(-1 * var(--cdp-margin-left));
      margin-right: calc(-1 * var(--cdp-margin-right));
      background: var(--cdp-page-break-background);
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

const getTopLevelBlocks = (view: EditorView) => {
	const blocks: Array<{ pos: number; nodeSize: number; typeName: string; element: HTMLElement }> =
		[];

	view.state.doc.descendants((node, pos, parent) => {
		if (parent !== view.state.doc) {
			return false;
		}

		const element = view.nodeDOM(pos) as HTMLElement | null;
		if (element instanceof HTMLElement) {
			blocks.push({ pos, nodeSize: node.nodeSize, typeName: node.type.name, element });
		}

		return false;
	});

	return blocks;
};

const measurePageWidgets = (view: EditorView, options: DocumentPaginationOptions): PageWidget[] => {
	if (!options.enabled) {
		return [];
	}

	const blocks = getTopLevelBlocks(view);
	if (!blocks.length) {
		return [];
	}

	const contentHeight = getContentHeight(options);
	const widgets: PageWidget[] = [];
	let cursor = 0;
	let previousBottom: number | undefined;

	for (const block of blocks) {
		const rect = block.element.getBoundingClientRect();
		const gapBefore =
			previousBottom === undefined ? 0 : Math.max(0, Math.round(rect.top - previousBottom));
		const blockHeight = Math.max(0, Math.ceil(rect.height));

		if (block.typeName === 'pageBreak') {
			const fillerHeight = Math.max(0, contentHeight - cursor) + options.marginBottom;
			widgets.push({
				pos: block.pos + block.nodeSize,
				fillerHeight,
				manual: true
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
				manual: false
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
	const decorations = widgets.map((widget, index) => {
		return Decoration.widget(
			widget.pos,
			() => {
				const el = document.createElement('div');
				el.classList.add('cdp-page-widget');
				el.dataset.pageWidget = widget.manual ? 'manual' : 'auto';
				el.dataset.pageWidgetIndex = String(index);

				const fill = document.createElement('div');
				fill.classList.add('cdp-page-fill');
				fill.style.setProperty('--cdp-page-fill-height', `${widget.fillerHeight}px`);

				const gap = document.createElement('div');
				gap.classList.add('cdp-page-gap');

				const nextPageMargin = document.createElement('div');
				nextPageMargin.classList.add('cdp-next-page-margin');

				el.append(fill, gap, nextPageMargin);
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

					const requestMeasure = () => {
						if (queued) {
							return;
						}
						queued = true;
						requestAnimationFrame(() => {
							queued = false;
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

					requestMeasure();

					return {
						update: () => {
							const pluginState = paginationKey.getState(view.state);
							if (!pluginState?.measured) {
								requestMeasure();
							}
						},
						destroy: () => {}
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
			updatePageBreakBackground: (color: string) => update({ pageBreakBackground: color }),
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
