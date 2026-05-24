export { default as DocumentEditor } from './components/DocumentEditor.svelte';
export { buildPagedJsHtml } from './print/build-printable-html.js';
export { printWithPagedJs } from './print/print-with-pagedjs.js';
export { PAGE_FORMATS } from './print/page-formats.js';
export type { PageFormatKey, PageFormat } from './print/page-formats.js';
export type { PagedJsDocumentOptions } from './print/build-printable-html.js';
export type { PrintWithPagedJsOptions } from './print/print-with-pagedjs.js';
export type { Editor as TiptapEditor, Extensions } from '@tiptap/core';
export {
	DocumentPagination,
	type DocumentPaginationOptions
} from './extensions/DocumentPagination.js';
export { PAGE_SIZES } from './extensions/page-sizes.js';
export { PageBreak } from './extensions/PageBreak.js';
export type { PageSize } from './extensions/page-sizes.js';
