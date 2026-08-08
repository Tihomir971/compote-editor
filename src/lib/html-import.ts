const BLOCK_TAGS = new Set([
	'ADDRESS',
	'ARTICLE',
	'ASIDE',
	'BLOCKQUOTE',
	'BODY',
	'COL',
	'COLGROUP',
	'DD',
	'DIV',
	'DL',
	'DT',
	'FIELDSET',
	'FIGCAPTION',
	'FIGURE',
	'FOOTER',
	'FORM',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'HEADER',
	'HR',
	'LI',
	'MAIN',
	'NAV',
	'OL',
	'P',
	'PRE',
	'SECTION',
	'TABLE',
	'TBODY',
	'TD',
	'TFOOT',
	'TH',
	'THEAD',
	'TR',
	'UL'
]);

function isBlock(node: Node | null): boolean {
	return node === null || (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.nodeName));
}

/**
 * Strips whitespace-only text nodes that sit *between block elements* — the indentation and
 * newlines of pretty-printed markup, which the parser would otherwise turn into empty
 * paragraphs. Whitespace between inline elements is load-bearing (it separates words) and is
 * kept, as is everything inside `<pre>`.
 */
function stripFormattingWhitespace(root: HTMLElement): void {
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const doomed: Text[] = [];

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		if (node.data.trim() !== '') continue;
		if (node.parentElement?.closest('pre')) continue;
		if (isBlock(node.previousSibling) && isBlock(node.nextSibling)) doomed.push(node);
	}

	for (const node of doomed) node.remove();
}

/**
 * Normalizes a pasted HTML string into a fragment the editor can parse.
 *
 * Accepts either a bare fragment (`<p>hi</p>`) or a full document (`<!DOCTYPE html><html>…`)
 * and returns only the body markup. `<head>` content, scripts, styles and comments are
 * dropped — they have no representation in the schema and would otherwise surface as
 * stray text nodes.
 *
 * Browser-only: uses `DOMParser`.
 */
export function extractBodyHtml(input: string): string {
	const parsed = new DOMParser().parseFromString(input, 'text/html');
	const body = parsed.body;

	for (const el of body.querySelectorAll('script, style, link, meta, title, base')) {
		el.remove();
	}

	// Comments go before whitespace stripping: removing a comment leaves the newlines that
	// surrounded it adjacent to block elements, where they can then be collapsed.
	const walker = parsed.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
	const comments: Comment[] = [];
	while (walker.nextNode()) comments.push(walker.currentNode as Comment);
	for (const comment of comments) comment.remove();

	// Removing a comment or script leaves the whitespace on either side of it as two adjacent
	// text nodes; merge them so each is seen as sitting directly between block elements.
	body.normalize();
	stripFormattingWhitespace(body);

	return body.innerHTML.trim();
}

function openTag(el: Element): string {
	const attrs = [...el.attributes]
		.map((attr) => ` ${attr.name}="${attr.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
		.join('');

	return `<${el.localName}${attrs}>`;
}

function emit(node: Node, depth: number, lines: string[]): void {
	const indent = '\t'.repeat(depth);

	if (node.nodeType === Node.TEXT_NODE) {
		const text = (node as Text).data.trim();
		if (text !== '') lines.push(indent + text);
		return;
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return;

	const el = node as Element;
	const hasBlockChildren = [...el.children].some((child) => BLOCK_TAGS.has(child.nodeName));

	// Leaf blocks, anything inline, and <pre> (whose whitespace is significant) are emitted
	// verbatim on one line — breaking inside them would change the rendered text.
	if (el.nodeName === 'PRE' || !BLOCK_TAGS.has(el.nodeName) || !hasBlockChildren) {
		lines.push(indent + el.outerHTML);
		return;
	}

	lines.push(indent + openTag(el));
	for (const child of el.childNodes) emit(child, depth + 1, lines);
	lines.push(indent + `</${el.localName}>`);
}

/**
 * Pretty-prints HTML for display in the source dialog: one block element per line, nested
 * blocks indented with tabs.
 *
 * Line breaks are only introduced *between* block elements, never inside inline content or
 * `<pre>`, so the added whitespace is exactly the kind `extractBodyHtml` strips on the way
 * back in. Formatting is therefore round-trip safe.
 *
 * Browser-only: uses `DOMParser`.
 */
export function formatHtml(input: string): string {
	const body = new DOMParser().parseFromString(input, 'text/html').body;
	const lines: string[] = [];

	for (const child of body.childNodes) emit(child, 0, lines);

	return lines.join('\n');
}

/**
 * Heuristic check for whether a string is HTML markup rather than prose that merely
 * contains an angle bracket. Requires a matched tag pair or a self-closing/void tag.
 */
export function looksLikeHtml(input: string): boolean {
	return /<([a-z][a-z0-9-]*)\b[^>]*>[\s\S]*<\/\1>|<(br|hr|img|input)\b[^>]*\/?>|<!doctype html/i.test(
		input
	);
}
