import { buildPagedJsHtml } from './build-printable-html.js';
import type { PageFormatKey } from './page-formats.js';
import pagedJsContent from './paged.polyfill.txt?raw';

export interface PrintWithPagedJsOptions {
	content: string;
	format?: PageFormatKey;
	lang?: string;
}

export function printWithPagedJs({
	content,
	format = 'A4',
	lang = 'en'
}: PrintWithPagedJsOptions): void {
	const html = buildPagedJsHtml({ content, format, lang, pagedJsInlineContent: pagedJsContent });

	const blob = new Blob([html], { type: 'text/html' });
	const url = URL.createObjectURL(blob);

	const iframe = document.createElement('iframe');
	iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;';
	document.body.appendChild(iframe);

	iframe.addEventListener(
		'load',
		() => {
			URL.revokeObjectURL(url);
			iframe.contentWindow?.addEventListener(
				'afterprint',
				() => document.body.removeChild(iframe),
				{ once: true }
			);
		},
		{ once: true }
	);

	iframe.src = url;
}
