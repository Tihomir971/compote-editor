export const PAGE_FORMATS = {
	A4: {
		width: '210mm',
		height: '297mm',
		widthPx: 794,
		heightPx: 1123,
		marginTop: '25mm',
		marginRight: '20mm',
		marginBottom: '25mm',
		marginLeft: '20mm'
	},
	Letter: {
		width: '216mm',
		height: '279mm',
		widthPx: 816,
		heightPx: 1056,
		marginTop: '25mm',
		marginRight: '20mm',
		marginBottom: '25mm',
		marginLeft: '20mm'
	}
} as const;

export type PageFormatKey = keyof typeof PAGE_FORMATS;
export type PageFormat = (typeof PAGE_FORMATS)[PageFormatKey];
