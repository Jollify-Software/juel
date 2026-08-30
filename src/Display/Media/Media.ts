import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import { html, PropertyValueMap, unsafeCSS } from "lit";
import { when } from "lit/directives/when";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import Styles from "bundle-text:./Media.less";
import { isMediaSource, MediaSourceType } from "../../_Utils/String/isMediaSource";
import { choose } from "lit/directives/choose";

@customElement("juel-media")
export class JuelMedia extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property()
    src: string = '';
    @property()
    blend: string = 'unset';
    @property({ type: Boolean })
    background: boolean;
    @property()
    alt: string = '';
    /** Drop a shadow beneath the media (alpha-aware `drop-shadow`). Tune with `--media-shadow`. */
    @property({ type: Boolean, reflect: true })
    shadow: boolean = false;
    /** Render a fading mirror image below the media. Tune with `--reflection-gap` / `--reflection-color` / `--reflection-length`. */
    @property({ type: Boolean, reflect: true })
    reflection: boolean = false;
    /**
     * Soften the edges with an inset glow. Bare (`feather`) or `feather="all"` feathers all
     * four edges; `feather="top left"` (space/comma separated: `top` `right` `bottom` `left`)
     * feathers only those. Tune with `--feather-color` / `--feather-size`.
     */
    @property({ reflect: true })
    feather: string | null = null;

    sourceType: MediaSourceType;

    index: number;

    private static readonly FEATHER_EDGES = ['top', 'right', 'bottom', 'left'];

    /** Normalised list of edges to feather (empty when the effect is off). */
    get featherEdges(): string[] {
        if (this.feather == null) return [];
        const v = this.feather.trim().toLowerCase();
        if (v === '' || v === 'all' || v === 'true') return [...JuelMedia.FEATHER_EDGES];
        return v.split(/[\s,]+/).filter(e => JuelMedia.FEATHER_EDGES.includes(e));
    }

    /** `box-shadow` value for the feather overlay — a symmetric glow for all four edges,
     * otherwise one directional inset shadow per requested edge. */
    private featherBoxShadow(edges: string[]): string {
        const s = 'var(--feather-size, 8px)';
        const c = 'var(--feather-color, #fff)';
        if (edges.length === 4) {
            return `0 0 ${s} ${s} ${c} inset`;
        }
        const neg = `calc(0px - ${s})`;
        const trim = `calc(${s} * -0.85)`;
        const perEdge: Record<string, string> = {
            top: `inset 0 ${s} ${s} ${trim} ${c}`,
            bottom: `inset 0 ${neg} ${s} ${trim} ${c}`,
            left: `inset ${s} 0 ${s} ${trim} ${c}`,
            right: `inset ${neg} 0 ${s} ${trim} ${c}`,
        };
        return JuelMedia.FEATHER_EDGES.filter(e => edges.includes(e)).map(e => perEdge[e]).join(', ');
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
        if (name == "src") {
            if (value && value.includes(" ")) {
                let splity = value.split(" ");
                this.index = Math.floor(Math.random() * splity.length);
            }
        }
        super.attributeChangedCallback(name, _old, value);
    }

    getSrc(): string {
        if (this.src.includes(" ")) {
            let splity = this.src.split(" ");
            return splity[this.index];
        }
        return this.src;
    }

    protected render(): unknown {
        if (!this.src) {
            return html``;
        }

        let splity: string[];
        if (this.src.includes(" ")) {
            splity = this.src.split(" ");
            this.sourceType = isMediaSource(splity[0]);
        } else {
            this.sourceType = isMediaSource(this.src);
        }
        if (this.sourceType.type === 'image') {
            let img = new Image();
            img.src = this.getSrc();
        }

        let featherEdges = this.featherEdges;
        let classes = {
            background: this.background,
            shadow: this.shadow,
            reflection: this.reflection,
            feather: featherEdges.length > 0
        };
        let containerStyles: Record<string, string> = {};
        if (featherEdges.length) {
            containerStyles['--feather-box-shadow'] = this.featherBoxShadow(featherEdges);
        }
        let styles;
        if (this.src.includes(' ') && this.blend) {
            splity = this.src.split(" ");
            styles = {
                'background-image': splity.map((str) => `url(${str})`).join(', '),
                'background-blend-mode': `${this.blend}`
            };
        }

        return html`<div id="container" class="${classMap(classes)}" style="${styleMap(containerStyles)}">
        ${choose(this.sourceType.type, [
            ["video", () => when(this.background, () => html`<video autoplay muted loop src="${this.getSrc()}"></video>`,
                () => html`<video controls src="${this.src}"></video>`)],
            ["audio", () => when(this.background, () => html`<audio autoplay muted loop src="${this.getSrc()}"></audio>`,
                () => html`<audio controls src="${this.src}"></audio>`)],
            ["image", () => when(splity && this.blend, () => html`<div style="${styleMap(styles)}"></div>`,
                () => html`<img src="${this.getSrc()}" alt="${this.alt}">`)
            ]
        ])}
        </div>`;
    }
}