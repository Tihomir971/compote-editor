/**
 * Single source of truth for page geometry.
 *
 * Sizes are declared in millimetres — the unit the printed page is actually measured in —
 * and converted to CSS pixels for the on-screen pagination extension. Both the editor and
 * the Paged.js print document derive from these values, so the content box is identical on
 * screen and on paper. Never hard-code a page dimension anywhere else.
 */

/** CSS reference pixels per millimetre. CSS defines 1in as exactly 96px and as 25.4mm. */
export const PX_PER_MM = 96 / 25.4;

/** Paper size and margins, in millimetres. */
export interface PageGeometry {
	width: number;
	height: number;
	marginTop: number;
	marginRight: number;
	marginBottom: number;
	marginLeft: number;
}

/** The same geometry in CSS pixels, as consumed by `DocumentPagination`. */
export interface PageSize {
	pageWidth: number;
	pageHeight: number;
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
}

const ISO_MARGINS = { marginTop: 25, marginRight: 20, marginBottom: 25, marginLeft: 20 };

/** US paper conventionally uses 1in margins on all sides. */
const US_MARGINS = { marginTop: 25.4, marginRight: 25.4, marginBottom: 25.4, marginLeft: 25.4 };

export const PAGE_GEOMETRY = {
	A3: { width: 297, height: 420, ...ISO_MARGINS },
	A4: { width: 210, height: 297, ...ISO_MARGINS },
	A5: { width: 148, height: 210, marginTop: 20, marginRight: 15, marginBottom: 20, marginLeft: 15 },
	Letter: { width: 215.9, height: 279.4, ...US_MARGINS },
	Legal: { width: 215.9, height: 355.6, ...US_MARGINS },
	Tabloid: { width: 279.4, height: 431.8, ...US_MARGINS }
} as const satisfies Record<string, PageGeometry>;

export type PageFormatKey = keyof typeof PAGE_GEOMETRY;

export const DEFAULT_PAGE_FORMAT: PageFormatKey = 'A4';

export const PAGE_FORMAT_KEYS = Object.keys(PAGE_GEOMETRY) as PageFormatKey[];

/** Convert millimetres to CSS pixels, kept at sub-pixel precision. */
export const mmToPx = (mm: number): number => Math.round(mm * PX_PER_MM * 100) / 100;

export const getPageGeometry = (format?: PageFormatKey): PageGeometry =>
	PAGE_GEOMETRY[format ?? DEFAULT_PAGE_FORMAT] ?? PAGE_GEOMETRY[DEFAULT_PAGE_FORMAT];

/** Screen geometry in CSS pixels, for `DocumentPagination`. */
export const toPageSize = (geometry: PageGeometry): PageSize => ({
	pageWidth: mmToPx(geometry.width),
	pageHeight: mmToPx(geometry.height),
	marginTop: mmToPx(geometry.marginTop),
	marginBottom: mmToPx(geometry.marginBottom),
	marginLeft: mmToPx(geometry.marginLeft),
	marginRight: mmToPx(geometry.marginRight)
});

export const getPageSize = (format?: PageFormatKey): PageSize =>
	toPageSize(getPageGeometry(format));

/**
 * The `@page` rule matching the geometry the editor lays out with. Emits explicit
 * dimensions rather than a size keyword so the print box cannot drift from the screen box.
 */
export const toPageRuleCss = (geometry: PageGeometry): string => {
	const { marginTop, marginRight, marginBottom, marginLeft } = geometry;
	const axisSymmetric = marginTop === marginBottom && marginLeft === marginRight;
	const margin = !axisSymmetric
		? `${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`
		: marginTop === marginLeft
			? `${marginTop}mm`
			: `${marginTop}mm ${marginLeft}mm`;

	return `@page {
	size: ${geometry.width}mm ${geometry.height}mm;
	margin: ${margin};
}`;
};
