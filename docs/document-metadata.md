# Document Metadata Plan

Currently `DocumentEditor` saves only HTML content. As document features grow, a metadata structure is needed alongside the HTML.

## Planned metadata shape

```ts
interface DocumentMeta {
	content: string; // HTML body
	format: 'A4' | 'Letter'; // page size
	orientation: 'portrait' | 'landscape';
	fontSize: '9pt' | '10pt' | '11pt'; // base font scale, cascades to all em-based elements
}
```

## Why each field lives outside the HTML

- `format` and `orientation` affect page dimensions (CSS variables on the pagination layer), not content
- `fontSize` is applied to `.document-content` and cascades to headings/tables via `em` units — it is a container concern, not a per-element style
- Storing these as inline styles inside the HTML would make them hard to read/update programmatically

## Migration path

1. Introduce `DocumentMeta` type in the library (`src/lib/index.ts`)
2. Add `orientation` prop to `DocumentEditor` (alongside existing `format`)
3. Add `fontSize` prop to `DocumentEditor` (default `11pt`, applied to `.document-content`)
4. Expose preset picker in the toolbar for `fontSize`
5. Update consumer apps to persist `DocumentMeta` instead of bare HTML string

## Notes

- Paged.js renders from the same DOM so all meta changes reflect correctly in print/PDF
- `format` is already a prop on `DocumentEditor` — orientation and fontSize follow the same pattern
