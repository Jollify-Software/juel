# `<juel-pdf>`

A PDF drawn page by page with [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla, Apache-2.0), so it looks and
behaves the same everywhere. A browser's own PDF viewer in a frame isn't enough: the Android WebView shows nothing,
Safari on iPhone and iPad shows only the first page, and nothing outside it can turn its pages.

```html
<meta name="juel-pdfjs" content="dist/pdfjs/pdf.min.mjs">
<juel-pdf src="q3-sales.pdf" alt="Q3 sales report" page="4" fit="width" controls></juel-pdf>
```

Example: `examples/Display/Pdf/pdf.html`. Tests: `tests/e2e/pdf.spec.ts`, `tests/Pdf/Pages.test.ts`.

## Where pdf.js comes from

pdf.js isn't in `juel.js`: it's about 1.7 MB, so it loads the first time a `<juel-pdf>` needs it, from the element's
`library` attribute or else the page's `<meta name="juel-pdfjs">`. It's loaded with a module `<script>` (no `eval`),
and sets `globalThis.pdfjsLib`; a page that already has `pdfjsLib` uses that.

Its worker, standard fonts, character maps, image decoders and colour profiles are found beside `pdf.min.mjs`.
A page whose pdf.js has nothing beside it (a `blob:` URL, as the Jollify editor's sandboxed preview gets it)
names the worker in `<meta name="juel-pdfjs-worker">`, and pdf.js does without the rest: built-in fallback fonts,
and no JPEG 2000 pictures.
`npm run pdfjs` (run by `npm run build`) copies them all from `pdfjs-dist`, pinned in `package.json`, into
`dist/pdfjs/` (5.5 MB, not committed). Jetty runs the same script for the folder it ships beside a deck.

## Attributes and properties

| | |
|-|-|
| `src` | The PDF's URL (a `blob:` URL works). |
| `page` | The page on show, from 1 (reflected). Clamped to the document once it has loaded. |
| `fit` | `page` (default): the whole page fits. `width`: its width fits and it scrolls down. |
| `zoom` | 1 is fitted, from 0.25 to 6. Ctrl + wheel, or `+`, `-` and `0` with it focused. |
| `deferred` | Holds back: nothing loads until it's taken away. Set again, the document is let go and its last page stays on show. |
| `controls` | ‹ page / pages › and − + under the page. |
| `alt` | What a screen reader hears (`aria-label`), and the name in its messages. |
| `poster` | A picture shown until a page is drawn. Without one, a held-back element that has drawn nothing shows a page icon and its name. |
| `library` | Where pdf.js loads from, if not the page's meta. |
| `pageCount` | Read only: its pages, once loaded (0 before). |
| `loaded` | A promise: true once it has loaded and drawn its page, false if it can't show. Renewed with each `src`. |
| `still` | The page as last drawn, as a PNG data URL, or `''`. |

Methods: `next()` and `previous()` (false at the end), `goTo(page)`, `getView()` and `setView(view)` (a
`PdfView`: `{ page, zoom, x, y }`, `x` and `y` from 0 to 1 as scrolled), and `drawStill()`, which loads and
draws its page once for print, then holds back again if it was.

## Events

All bubble and are composed.

- `juel-pdf-load` `{ pages }`: the document has loaded.
- `juel-pdf-page` `{ page, pages }`: the page changed (not the first one).
- `juel-pdf-drawn` `{ page }`: a page is on the canvas.
- `juel-pdf-error` `{ error }`: `library` (pdf.js didn't load), `missing`, `password` or `unreadable`. The element
  then shows a message: what's in it (its slot), or a sentence of its own ("Q3 sales report has a password. Save a
  copy without one, then use that.").
- `juel-view-change` (a `PdfView`): a person scrolled, zoomed or pressed a page button. `setView` fires none, so
  two screens can follow each other without an echo.

## How it draws

One canvas, sized to the element times the device's pixel ratio (up to 3, and never past 16 million pixels, which
is Safari's limit). After each page it draws the pages either side into canvases off the page, so the next turn
is a copy, not a render (measured on a 54-page report in Chrome: 30–730 ms a page drawn, instant a page turned).
A resize redraws. pdf.js runs with `isEvalSupported: false` and no XFA forms; the PDF's own scripts never run.

**Not yet:** a text layer (selecting text), links inside the PDF, search and thumbnails.

## Styling

`--juel-pdf-background` (behind the page, default transparent), `--juel-pdf-shadow` (round the page),
`--juel-pdf-message-background`, `--juel-pdf-placeholder-background`. Parts: `scroller`, `page`, `poster`, `placeholder`, `message`, `loading`, `controls`.

`<juel-file-viewer>` uses it for PDFs on any page that has the meta (or `pdfjsLib`), and a frame otherwise.
