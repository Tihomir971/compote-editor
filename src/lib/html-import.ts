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

/**
 * Heuristic check for whether a string is HTML markup rather than prose that merely
 * contains an angle bracket. Requires a matched tag pair or a self-closing/void tag.
 */
export function looksLikeHtml(input: string): boolean {
	return /<([a-z][a-z0-9-]*)\b[^>]*>[\s\S]*<\/\1>|<(br|hr|img|input)\b[^>]*\/?>|<!doctype html/i.test(
		input
	);
}
