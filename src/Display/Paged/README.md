# `<juel-paged>`

HTML laid out as pages and shown a page at a time, as `<juel-pdf>` shows a PDF's: for a document written as pages.
Slipway reads a Word document (`.docx`) into exactly this (jetty MARKDOWN.md "Documents"), so a slide shows Word pages
with no Office and no converter.

```html
<juel-paged page-width="595.3" page-height="841.9" margins="72 72 72 72" font="'Calibri', Carlito, sans-serif" font-size="11" controls>
  <template>…the body's HTML…</template>
  <template data-part="header"><p>Q3 memo, page <span class="paged-page"></span> of <span class="paged-pages"></span></p></template>
  <template data-part="footer">…</template>
</juel-paged>
```

Example: `examples/Display/Paged/paged.html` (a Word document Slipway read, and a long table). Tests:
`tests/e2e/paged.spec.ts`.

## Pages

The body's top-level blocks fill a page, measured in a hidden page of the real size, until the next one would overflow.

- A **table** that doesn't fit is split between its rows; rows with `data-paged-header` repeat at the top of each part.
- `<div class="paged-break"></div>` starts a new page (Word's page breaks and section ends).
- A block taller than a page has a page to itself and is cut off (a paragraph isn't split between lines).
- Fonts and pictures are waited for before measuring.
- The header and footer go on every page, `header-distance` from the top and `footer-distance` from the bottom;
  `.paged-page` and `.paged-pages` in them are filled with the page's number and the count.

Inside a page, paragraphs and headings have no margins of their own (the HTML gives them, as Word spaces them), line
height is 1.15, and tables collapse their borders.

## Attributes and properties

The same as `<juel-pdf>`'s, so a page that shows PDFs can show these with the same code: `page`, `fit` (`page` or
`width`), `zoom`, `deferred` (nothing is laid out until it's taken away), `controls`, `alt`, `poster`; `pageCount`,
`loaded`, `next()`, `previous()`, `goTo()`, `getView()` / `setView()`, `drawStill()`; the `juel-pdf-load`,
`juel-pdf-page`, `juel-pdf-drawn` and `juel-view-change` events. `still` is always `''`: the pages are HTML, so they
print and copy as they are.

Its own: `page-width`, `page-height` and `margins` (top right bottom left) in points (A4 with inch margins unless
said), `header-distance`, `footer-distance`, and `font` / `font-size` for text the HTML doesn't style.

Styling: `--juel-paged-background`, `--juel-paged-shadow`, `--juel-paged-placeholder-background`. Parts: `scroller`,
`page`, `poster`, `placeholder`, `controls`.

**Not yet:** a paragraph split between pages by its lines (Word's widow and orphan control), columns, footnotes.
