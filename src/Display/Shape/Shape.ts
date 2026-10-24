import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query } from "lit/decorators";
import interact from "@interactjs/interactjs";
import Styles from 'bundle-text:./Shape.less';
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { getSlottedElements } from "../../_Utils/dom/GetSlottedElements";
import { DomReady } from "../../_Utils/DomReady";
import { CompassPositions } from "../../_Core/CompassPositions";
import { IconsModule } from "../../_Modules/Icons/IconsModule";
import { ShapeTemplateService } from "./Services/ShapeTemplateService";
import {
    ClipShape, getClipShape, matchShapes, shapeNames, ShapePoints,
    registerShape as defineClipShape,
} from "./ClipShapes";

export { shapeNames } from "./ClipShapes";

/** Every connected <juel-shape>, so a late `registerShape` can refresh them. */
const instances = new Set<JuelShape>();

/**
 * Register a geometric shape, then re-resolve any already-mounted
 * `<juel-shape>` that references it by name — so `registerShape(...)` followed
 * by (or preceded by) `<juel-shape type="...">` works regardless of order.
 */
export function registerShape(name: string, shape: ClipShape | ShapePoints): void {
    defineClipShape(name, shape);
    for (const el of instances) {
        if (el.type === name || el.hover === name) el.refreshShape();
    }
}

// Public API surface, alongside window.juel.audio / .icon / .toast …
//   window.juel.shape.registerShape(name, points)
const g = globalThis as any;
g.juel = g.juel || {};
g.juel.shape = {
    registerShape,
    shapeNames,
    has: (name: string) => !!getClipShape(name),
};

/** `hover` attribute values that mean "morph from a plain rect into `type`". */
const HOVER_BOOLEAN = new Set(["", "true", "hover", "yes"]);

/** Property changes that require re-resolving the shape layer. */
const SHAPE_PROPS = ["type", "src", "hover", "fit", "args"];

/**
 * `<juel-shape type="…">` renders a shape layer behind its slotted content.
 *
 * `type` resolves, in order, to:
 *  1. a slotted `<template>` — a fully custom SVG (see `ShapeTemplateService`);
 *  2. a built-in geometric shape — a CSS `clip-path` on a plain box, so it
 *     scales with no JavaScript (`src/Display/Shape/ClipShapes.ts`);
 *  3. a matching icon glyph — the icon SVG injected into the shape layer;
 *  4. `src` — an image, optionally clipped by a geometric `type`.
 *
 * Everything except the `<template>` path is reactive: changing `type`, `src`,
 * `hover`, `fit` or `args` re-renders the shape layer in place.
 *
 * `hover` turns the shape into a hover reveal: `hover` on its own morphs a
 * plain rectangle into `type`; `hover="<other-shape>"` morphs `type` into that
 * shape. Geometric ↔ geometric animates the `clip-path`; anything involving an
 * icon or template cross-fades instead.
 *
 * `label` makes the shape a labelled image for assistive tech
 * (`role="img" aria-label`); without it the shape layer is `aria-hidden` and
 * only slotted content is exposed.
 */
@customElement("juel-shape")
export class JuelShape extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    /** Geometric shape name, icon name, or (with a slotted `<template>`) unused. */
    @property() type: string;
    /** Image source. Rendered in the shape layer; clipped if `type` is geometric. */
    @property() src: string;
    /** Compass point to rotate the shape layer to (slotted content stays upright). */
    @property({ type: String }) direction: string = CompassPositions.North;
    /** Legacy `key: value; …` bag — only `fill` is still honoured (maps to `--fill`). */
    @property({ converter: DOMStringMapConverter }) args: Record<string, string>;
    /** Convenience text, layered over the shape (same as slotted text). */
    @property() text: string;
    /** Hover reveal: bare = morph rect → `type`; a name = morph `type` → name. */
    @property() hover: string;
    /** Accessible name; sets `role="img" aria-label` on the host when present. */
    @property() label: string;
    /** Show interact.js resize handles. */
    @property({ type: Boolean }) editable: boolean = false;
    /** Force the host to a 1:1 box so regular polygons don't skew. */
    @property({ type: Boolean }) regular: boolean = false;
    /** `preserveAspectRatio` for injected icon / image SVGs. */
    @property() fit: string = "xMidYMid meet";

    @query(".svg-container:not(.svg-container--hover)") private container: HTMLDivElement;
    @query(".svg-container--hover") private hoverContainer: HTMLDivElement;
    @query("slot") private slotEl: HTMLSlotElement;

    private sts: ShapeTemplateService;
    private interactable: ReturnType<typeof interact> | null = null;
    private hasTemplate = false;
    private paintedOnce = false;

    protected render(): unknown {
        const rot = `rotate ${this.direction || CompassPositions.North}`;
        return html`
            <span class="content" part="content"><slot></slot>${this.text ?? ""}</span>
            <div part="shape" class="svg-container ${rot}" aria-hidden="true"></div>
            ${this.hover != null
                ? html`<div part="shape-hover" class="svg-container svg-container--hover ${rot}" aria-hidden="true"></div>`
                : ""}
        `;
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);
        if (this.regular) this.classList.add("juel-shape--regular");
        if (this.editable) this.addResizeHandles();

        // A slotted <template> is a one-shot custom SVG. Detect it now; re-check
        // once the DOM is fully parsed in case this element upgraded first.
        this.checkTemplate();
        if (!this.hasTemplate) DomReady().then(() => this.checkTemplate());
    }

    protected updated(changed: PropertyValues): void {
        super.updated(changed);
        if (changed.has("label")) this.applyLabel();
        if (changed.has("regular")) this.classList.toggle("juel-shape--regular", this.regular);
        if (this.hasTemplate) return;
        // A new direction re-renders the layers' class (render()), which drops
        // the classes applyShape() put there, so it repaints them too.
        if (!this.paintedOnce || changed.has("direction") || SHAPE_PROPS.some((p) => changed.has(p))) {
            this.applyShape();
            this.paintedOnce = true;
        }
    }

    connectedCallback(): void {
        super.connectedCallback();
        instances.add(this);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        instances.delete(this);
        this.interactable?.unset();
        this.interactable = null;
    }

    /** Re-resolve the shape layer now (called when a referenced shape is registered). */
    refreshShape(): void {
        if (this.hasTemplate || !this.container) return;
        this.applyShape();
    }

    // -- template path --------------------------------------------------------

    private checkTemplate(): void {
        if (this.hasTemplate) return;
        const templates = getSlottedElements(this.slotEl).filter(
            (x) => x.nodeName.toLowerCase() === "template"
        ) as HTMLTemplateElement[];
        if (templates.length === 0) return;

        this.hasTemplate = true;
        this.resetLayer(this.container);
        this.style.removeProperty("--_shape-clip");
        this.style.removeProperty("--_shape-clip-hover");
        this.sts = new ShapeTemplateService(this, templates);
    }

    // -- shape layer --------------------------------------------------------

    /** Resolve `type` / `hover` / `src` and (re)paint the shape layer(s). */
    private applyShape(): void {
        this.resetLayer(this.container);
        if (this.hoverContainer) this.resetLayer(this.hoverContainer);
        this.style.removeProperty("--_shape-clip");
        this.style.removeProperty("--_shape-clip-hover");

        if (this.args?.fill) this.style.setProperty("--fill", this.args.fill);

        // A plain image: `src` with a non-geometric `type`.
        if (this.src && !getClipShape(this.type)) {
            this.renderImage(this.container, this.src);
            return;
        }

        const restShape = this.resolveRestShape();
        const hoverShape = this.resolveHoverShape();
        this.paintLayer(this.container, restShape);

        if (!hoverShape) return;

        if (restShape.kind === "geometric" && hoverShape.kind === "geometric") {
            // Animate the clip-path itself.
            const matched = matchShapes(restShape.clip, hoverShape.clip);
            this.style.setProperty("--_shape-clip", matched.from);
            this.style.setProperty("--_shape-clip-hover", matched.to);
            this.container.classList.add("morph");
        } else if (this.hoverContainer) {
            // Cross-fade a second layer holding the hover shape.
            this.paintLayer(this.hoverContainer, hoverShape);
            this.container.classList.add("crossfade");
            this.hoverContainer.classList.add("crossfade", "crossfade--hover");
        }
    }

    /** What `<juel-shape>` shows at rest. */
    private resolveRestShape(): ResolvedShape {
        // `hover` on its own => rest is a plain rectangle.
        if (this.hover != null && HOVER_BOOLEAN.has(this.hover)) {
            return { kind: "geometric", clip: getClipShape("rect")! };
        }
        return this.resolveShape(this.type);
    }

    /** What it morphs to on hover, or `null` for a static shape. */
    private resolveHoverShape(): ResolvedShape | null {
        if (this.hover == null) return null;
        if (HOVER_BOOLEAN.has(this.hover)) return this.resolveShape(this.type);
        return this.resolveShape(this.hover);
    }

    private resolveShape(name: string): ResolvedShape {
        const clip = getClipShape(name);
        if (clip) return { kind: "geometric", clip };
        const icon = name ? IconsModule.get(name) : "";
        if (icon) return { kind: "icon", markup: icon };
        // Unknown type, no icon: fall back to a circle so something shows.
        return { kind: "geometric", clip: getClipShape("circle")! };
    }

    private resetLayer(layer: HTMLElement | null): void {
        if (!layer) return;
        layer.replaceChildren();
        layer.classList.remove("filled", "morph", "crossfade", "crossfade--hover");
        layer.style.removeProperty("clip-path");
    }

    private paintLayer(layer: HTMLDivElement, shape: ResolvedShape): void {
        if (shape.kind === "geometric") {
            layer.classList.add("filled");
            // The rest layer defers to the --_shape-clip var (so :hover can swap
            // it); extra layers get the value directly.
            if (layer === this.container) {
                this.style.setProperty("--_shape-clip", shape.clip.css);
            } else {
                layer.style.setProperty("clip-path", shape.clip.css);
            }
            if (this.src) this.renderImage(layer, this.src);
        } else {
            this.injectSvg(layer, shape.markup);
        }
    }

    private injectSvg(layer: HTMLElement, markup: string): void {
        layer.innerHTML = markup;
        const svg = layer.querySelector("svg");
        if (svg) {
            svg.setAttribute("preserveAspectRatio", this.fit);
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
        }
    }

    private renderImage(layer: HTMLElement, src: string): void {
        const img = new Image();
        img.src = src;
        img.decoding = "async";
        img.alt = "";
        layer.appendChild(img);
    }

    // -- a11y --------------------------------------------------------------

    private applyLabel(): void {
        if (this.label) {
            this.setAttribute("role", "img");
            this.setAttribute("aria-label", this.label);
        } else {
            if (this.getAttribute("role") === "img") this.removeAttribute("role");
            this.removeAttribute("aria-label");
        }
    }

    // -- editable --------------------------------------------------------

    private addResizeHandles(): void {
        const handles = document.createElement("div");
        handles.className = "resize-handles";
        this.renderRoot.appendChild(handles);
        this.interactable = interact(handles).resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move: (event) => {
                    this.style.width = `${event.rect.width}px`;
                    this.style.height = `${event.rect.height}px`;
                },
            },
        });
    }

    /** All geometric shape names currently registered. */
    static get shapes(): string[] {
        return shapeNames();
    }
}

type ResolvedShape =
    | { kind: "geometric"; clip: ClipShape }
    | { kind: "icon"; markup: string };
