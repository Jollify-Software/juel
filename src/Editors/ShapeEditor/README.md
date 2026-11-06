# juel-shape-editor

Draw a shape the way you would in Paint, and get a real SVG. Press, drag, there's your shape. For someone who has
used Paint and has never heard of SVG: no jargon in the labels or tooltips.

Paint-like to use, vector underneath. Every mark stays a separate object you can select and change later, so the
fill tool recolours the mark you click and the eraser removes whole marks, or part of a line if you choose that (its
tooltip says so). There are no pixels: pixel painting wouldn't make a real SVG.

```html
<juel-shape-editor id="editor" style="height: 560px"></juel-shape-editor>
<script>
    editor.value = svgText;                                   // '' or unset: a blank drawing
    editor.addEventListener('shape-changed', e => { /* e.detail.reason */ });
    save(editor.svg);                                         // the drawing as a tidy file
</script>
```

| Member | |
|---|---|
| `value` | An SVG file's text to open. Setting it starts again, with nothing to undo |
| `svg` | The drawing as a file (read only) |
| `empty` | Nothing drawn yet |
| `notes` | What opening `value` had to leave out, in plain words; show them to the person |
| `drawing` | The marks (a copy): `{ marks, defs? }`, see `shapeModel.ts` |
| `tool` | The tool in use (reflected as an attribute); `setTool()` changes it properly, finishing a curve in progress |
| `toPng(scale = 2)` | The drawing as a PNG `Blob` with a see-through background; the long side stops at 4096 pixels |
| `undo()`, `redo()`, `fit()` | |
| `focus()` | Puts the keyboard on the drawing, where the keys work, so `autofocus` in a `juel-modal` does the right thing |
| `shape-changed` | Every edit, `{ reason }`: `draw`, `move`, `resize`, `rotate`, `style`, `fill`, `erase`, `history`, … |

The chrome follows Juel's tokens, light or dark. The page stays a pale checker in both, like paper: a saved shape has
no background, and the checker shows what's see-through (`--shape-paper`, `--shape-paper-check`).

## Tools

The tooltip of each names its key.

| Tool | Key | |
|---|---|---|
| Select | V | Click, Shift+click, drag a box. Move, resize, turn with the handles; arrows nudge (Shift for 10). Double-click: its points |
| Change points | N | Drag a point; double-click the line to add one; Delete removes the picked one. A picked point on a curve shows its bend handles |
| Pencil | P | Freehand, simplified and smoothed. Finish where you started and it closes, so it can be filled |
| Line, Arrow | L, A | Shift locks to 45° |
| Rectangle, Rounded rectangle, Circle or oval, Triangle | R, U, E, T | Shift makes it even, Alt draws from the middle |
| Many-sided shape, Star | Y, S | The number of sides or points is in the options above |
| Ready-made shapes | K | Heart, speech bubble, cloud, arrows, plus, lightning, drop, moon, chosen in the options. An ordinary mark once drawn, so its points can be changed (`shapePresets.ts`) |
| Words | W | Type in the options, then click to place them, or drag to set their size. They become a shape, because an SVG picture can't load a font: colour them, join them, cut them out, but not retype them. Their edges are followed from pixels (`traceOutlines`), so they need no font file, and they are many short straight lines, smooth at the sizes they'd be seen |
| Curve | C | Click for points, drag for a bend, double-click or Enter to finish, click the first point to close. Backspace takes the last off, Escape throws it away |
| Fill | F | The mark you click takes the fill colour (a line, the line colour) |
| Copy colours | I | The next mark has the colours of the one you click; goes back to the tool you were on |
| Eraser | X | Click or drag over marks: whole marks go. One undo step. With **Rub out: Part of a line** (and a Size), a line loses only what the circle crosses and comes apart in pieces. A filled shape, a locked part and a shape with a hole stay whole, and it says so |
| Move the view | H | Or hold Space with any tool, or the middle button. The wheel moves the view; Ctrl and the wheel zoom |

Other keys: Ctrl+Z, Ctrl+Y (no limit), Ctrl+D duplicate, Ctrl+C/X/V within the editor, Delete, Ctrl+A, Ctrl+G and Ctrl+Shift+G
group and ungroup, Ctrl+] and Ctrl+[ front and back, Shift+H and Shift+V flip, G grid (shows it and lines marks up
with it), + - 0 zoom and see it all. Colour, line and opacity changes apply to what's picked, or else the next mark, and a burst
of changes is one undo step.

**Join** (Shift+J) makes the picked closed shapes one shape. **Cut out** (Shift+K) takes the shapes on top out of the one furthest
back. The result has that shape's look and place, and curves stay curves (`shapeOps.ts`). A cut from the middle leaves a real hole;
a shape can end up in separate parts. It stays one mark: Change points works on its biggest outline only, and the eraser leaves it alone.
Lines and locked parts can't be joined; it says so and changes nothing, as it does for a cut that misses or would leave nothing.

Pointer Events throughout, so mouse, pen and touch all work. Not yet: pinching with two fingers to zoom (the buttons
and the Move the view tool do it on a tablet).

## The file

`shapeToSvg` writes a normal SVG: no scripts, no outside references, a `viewBox` from 0 0 trimmed to what was drawn plus the line
widths, real `<rect>`, `<ellipse>`, `<line>`, `<polygon>` and `<path>` elements. There is no sidecar: reopening reads the file
itself. The `data-shape` attributes (`arrow`, `group`, `locked`, `holes`) tell this editor what was what, and everything else ignores them.

## Opening any SVG

`shapeSvg.ts`. The editor draws the file inside the page, so `sanitiseSvg` first takes out everything that could run or
fetch, and says what went: scripts, event attributes, links to outside files (`href`, `url()`, `@import`), embedded web
content, animations. Elements are checked against a list of what's only drawing. Pictures inside the file (`data:image/…`) stay.

Then `parseShapeSvg` makes basic shapes and paths into marks, taking in styles and transforms from their parents. Whatever a mark can't
say exactly is kept word for word as a **locked mark** that moves, resizes, turns and flips as a whole, so nothing is lost
without saying so: text, pictures, `<use>`, gradient fills, filters, clips, odd line ends, a filled path with holes, see-through
groups, anything with a class when the file has a `<style>`. Their `<defs>` and `<style>` are kept too.
