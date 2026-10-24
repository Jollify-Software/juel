# `<juel-shape>`

A shape layer painted **behind** slotted content. Four ways to say what the
shape is, resolved in this order:

| Source | How | Reactive? |
| --- | --- | --- |
| Slotted `<template>` | Full custom SVG, handled by `Services/ShapeTemplateService.ts`. Supports named `<template name="x">` sub-templates and `foreignObject` text. | No — one-shot |
| Geometric `type` | A CSS `clip-path` from `ClipShapes.ts` on a plain filled box. No JS, scales with the element. | Yes |
| Icon `type` | `type` that isn't geometric → `IconsModule.get(type)` SVG injected into the shape layer. | Yes |
| `src` | An image. Clipped by `type` if `type` is geometric; a plain `<img>` otherwise. | Yes |

Everything except the `<template>` path re-renders in place when `type`, `src`,
`hover`, `fit` or `args` change.

## Sizing & fill

Size with the **`--width` / `--height` custom properties**, not bare
`width`/`height` type-selector rules (those lose to the component's `:host`
default):

```css
juel-shape { --width: 120px; --height: 120px; }
```

`--fill` takes any CSS `background` value — a colour **or a gradient**:

```html
<juel-shape type="hexagon" style="--fill: linear-gradient(135deg, #7b2ff7, #f107a3)"></juel-shape>
```

Geometric shapes skew to fill a non-square box (normal `clip-path` behaviour).
`regular` forces `aspect-ratio: 1` so regular polygons stay regular. `fit` sets
`preserveAspectRatio` on injected icon/image SVGs (default `xMidYMid meet`).

`direction` (`n ne e se s sw w nw`) rotates the shape layer; slotted content
stays upright.

All of `type`, `src`, `hover`, `fit`, `args`, `direction` and `regular` can change
after the first paint (a live preview, say): the shape is repainted.

## `ClipShapes.ts` — the geometric registry

```ts
export interface ClipShape {
    css: string;          // crisp CSS clip-path for static render
    points: ShapePoints;  // percentage-space polygon, for morphing
}
```

`getClipShape(name)` → `ClipShape | null`. Built-ins: `rect` `square` `circle`
`ellipse` `triangle` `triangle-down` `diamond` `rhombus` `kite` `pentagon`
`hexagon` `hexagon-flat` `heptagon` `octagon` `star` `star-4` `star-6` `star-8`
`burst` `seal` `arrow` `chevron` `tab` `trapezoid` `parallelogram` `gem`
`shield` `home` `bookmark` `heart` `speech` `plus` `cross`.

### Adding your own

```js
juel.shape.registerShape('bolt', [
    [55, 0], [20, 55], [45, 55], [35, 100], [80, 40], [52, 40]
]);
// then: <juel-shape type="bolt"></juel-shape>
```

`registerShape(name, pointsOrClipShape)` — a percentage-space polygon point
list, or a full `ClipShape` (for a custom crisp `css`). It also re-resolves any
already-mounted `<juel-shape>` that references `name`, so registration and use
can happen in either order. Also on the module API: `juel.shape.shapeNames()`,
`juel.shape.has(name)`.

## Hover morph

`hover` on its own morphs a **rectangle → `type`**; `hover="<shape>"` morphs
`type → <shape>`.

- **geometric ↔ geometric** animates the `clip-path`. `matchShapes(a, b)` grows
  both point lists to an equal count with `subdividePolygon` (keeps every
  original vertex, splits the longest edges) then picks the best rotation /
  winding, so the CSS interpolation eases around the perimeter.
- **icon / template** targets can't vertex-morph → a second `.svg-container`
  layer cross-fades in.

Tune with `--shape-morph-duration` (`0.35s`) and `--shape-morph-ease` (`ease`).

## Accessibility

The shape layer is decorative (`aria-hidden`). Give the host an accessible name
with `label` (→ `role="img" aria-label`) when the shape itself conveys meaning;
otherwise put meaningful content in the slot.

## Not supported (by design)

- Outlines on geometric shapes — `clip-path` clips the border too. Use a
  `<template>` SVG with `stroke`.
- Rounded polygon corners — no CSS primitive yet; use a `<template>`.
- Aspect-correcting regular polygons — would need JS resize observation; use
  `regular` or a square box.
