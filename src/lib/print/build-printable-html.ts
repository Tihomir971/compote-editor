import { DOCUMENT_FONT_FACE_CSS } from './embedded-fonts.js';
import typographyCss from './typography.css?raw';
import { PAGE_FORMATS, type PageFormatKey } from './page-formats.js';

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
	format = 'A4',
	lang = 'en',
	pagedJsScriptUrl,
	pagedJsInlineContent
}: PagedJsDocumentOptions): string {
	const pageFormat = PAGE_FORMATS[format];
	const pagedJsScript = pagedJsInlineContent
		? `<script>${pagedJsInlineContent}</script>`
		: `<script src="${pagedJsScriptUrl}"></script>`;

	const marginShorthand =
		pageFormat.marginTop === pageFormat.marginBottom &&
		pageFormat.marginLeft === pageFormat.marginRight
			? `${pageFormat.marginTop} ${pageFormat.marginLeft}`
			: `${pageFormat.marginTop} ${pageFormat.marginRight} ${pageFormat.marginBottom} ${pageFormat.marginLeft}`;

	return `<!DOCTYPE html>
<html lang="${lang}" data-format="${format}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page {
	size: ${format};
	margin: ${marginShorthand};
}

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
<div class="tiptap document-content">
${content}
</div>
</body>
</html>`;
}
