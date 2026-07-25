import { DOCUMENT_FONT_FACE_CSS } from './embedded-fonts.js';
import typographyCss from './typography.css?raw';
import {
	DEFAULT_PAGE_FORMAT,
	getPageGeometry,
	toPageRuleCss,
	type PageFormatKey
} from '../page-geometry.js';

export interface PagedJsDocumentOptions {
	content: string;
	format?: PageFormatKey;
	lang?: string;
	/** URL to load paged.polyfill.js from (mutually exclusive with pagedJsInlineContent) */
	pagedJsScriptUrl?: string;
	/** Inline paged.polyfill.js source (mutually exclusive with pagedJsScriptUrl) */
	pagedJsInlineContent?: string;
}

export function buildPagedJsHtml({
	content,
	format = DEFAULT_PAGE_FORMAT,
	lang = 'en',
	pagedJsScriptUrl,
	pagedJsInlineContent
}: PagedJsDocumentOptions): string {
	const pagedJsScript = pagedJsInlineContent
		? `<script>${pagedJsInlineContent}</script>`
		: `<script src="${pagedJsScriptUrl}"></script>`;

	return `<!DOCTYPE html>
<html lang="${lang}" data-format="${format}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${toPageRuleCss(getPageGeometry(format))}

html, body {
	margin: 0;
	padding: 0;
	background: white;
	color: black;
}

${DOCUMENT_FONT_FACE_CSS}

${typographyCss}
</style>
<script>
window.PagedConfig = {
	auto: true,
	after() { window.print(); }
};
</script>
${pagedJsScript}
</head>
<body>
<!-- No whitespace around the content: .document-content uses white-space: break-spaces to
     match the editor's line breaking, which would render stray newlines as real whitespace. -->
<div class="tiptap document-content">${content}</div>
</body>
</html>`;
}
