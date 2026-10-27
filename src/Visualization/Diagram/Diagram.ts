// <juel-diagram>: draws a diagram (src/Visualization/Diagram/README.md) as SVG, from a `data`
// property (the model, or its JSON text), a `<script type="application/json">` child, or a
// `src` URL. The drawing is in diagram units and scales to the element's box; its colours
// are the page's tokens (a Jetty deck's --ink / --accent / --chart-N), so one asset draws in
// any look, light or dark, and prints as it shows. A model with errors draws the problems.
import { CSSResultGroup, html, LitElement, nothing, svg, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Styles from 'bundle-text:./Diagram.less';
import { parseDiagram, type Diagram } from './diagramModel';
import { DefaultMetrics, layoutDiagram, type DiagramBox, type DiagramEdge, type DiagramLayout } from './diagramLayout';

@customElement('juel-diagram')
export class JuelDiagram extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    /** The model (an object), or its JSON text. */
    @property({ attribute: false }) data?: Diagram | string | null;
    /** A URL to fetch the JSON from, when `data` isn't given. */
    @property({ type: String }) src?: string;

    @state() private layout: DiagramLayout | null = null;
    @state() private problems: string[] = [];
    @state() private warnings: string[] = [];
    private fetched?: string;

    /** The last layout drawn (the editor reads it to know what was clicked). */
    get currentLayout(): DiagramLayout | null { return this.layout; }

    override connectedCallback() {
        super.connectedCallback();
        if (this.data !== undefined && this.data !== null) return;
        // Parsed from HTML with juel.js in <head>, the element connects before its children exist:
        // read the script child once the document is parsed (and now, for an element made later).
        if (!this.readScriptChild() && document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', () => { if (this.data === undefined || this.data === null) this.readScriptChild(); }, { once: true });
    }

    override willUpdate(changed: Map<string, unknown>) {
        if (changed.has('data') && this.data !== undefined && this.data !== null) this.build(this.data);
        else if (changed.has('src') && this.src && (this.data === undefined || this.data === null)) void this.load(this.src);
    }

    /** A `<script type="application/json">` child holds the model (how Slipway writes it inline). */
    private readScriptChild(): boolean {
        const script = this.querySelector(':scope > script[type="application/json"]');
        if (!script?.textContent?.trim()) return false;
        this.build(script.textContent);
        return true;
    }

    private async load(url: string) {
        if (this.fetched === url) return;
        this.fetched = url;
        try {
            const response = await fetch(url);
            if (!response.ok) { this.fail([`Couldn't load ${url} (${response.status}).`]); return; }
            const text = await response.text();
            if (this.fetched === url) this.build(text);
        } catch (e) {
            this.fail([`Couldn't load ${url}: ${(e as Error).message}`]);
        }
    }

    private build(input: Diagram | string) {
        const { diagram, errors, warnings } = parseDiagram(input);
        this.warnings = warnings;
        if (!diagram) { this.fail(errors); return; }
        this.problems = [];
        this.layout = layoutDiagram(diagram);
        this.dispatchEvent(new CustomEvent('diagram-drawn', { detail: { layout: this.layout, warnings }, bubbles: true, composed: true }));
    }

    private fail(problems: string[]) {
        this.problems = problems;
        this.layout = null;
    }

    override render() {
        if (this.problems.length) return html`<div class="problem" role="alert">This diagram can't be drawn:<ul>${this.problems.map(p => html`<li>${p}</li>`)}</ul></div>`;
        const l = this.layout;
        if (!l) return nothing;
        const title = l.title ? svg`<text class="title" x=${l.titleAt!.x} y=${l.titleAt!.y} text-anchor="middle" dominant-baseline="middle" font-size=${DefaultMetrics.fontSize * 1.3}>${l.title}</text>` : nothing;
        return html`<svg class=${l.type} viewBox="0 0 ${l.width} ${l.height}" width=${l.width} height=${l.height} role="img" aria-label=${l.title ?? `${l.type} diagram`} xmlns="http://www.w3.org/2000/svg">
            <defs><marker id="juel-diagram-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>
            ${title}
            ${l.axis ? svg`<line class="axis" x1=${l.axis.x1} y1=${l.axis.y1} x2=${l.axis.x2} y2=${l.axis.y2}></line>` : nothing}
            ${l.edges.map(e => this.renderEdge(e))}
            ${l.boxes.map(b => this.renderBox(b, l))}
            ${l.markers?.map(k => svg`<circle class="marker" data-for=${k.id} cx=${k.x} cy=${k.y} r="7"></circle>`) ?? nothing}
        </svg>`;
    }

    private renderEdge(e: DiagramEdge): TemplateResult {
        const d = e.points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
        const stem = e.from === e.to && e.points.length === 2; // a timeline's stem
        return svg`<g class="edge ${e.arrow ? 'arrow' : ''} ${stem ? 'stem' : ''}" data-from=${e.from} data-to=${e.to}>
            <path class=${stem ? 'stem' : ''} d=${d}></path>
            ${e.label && e.labelAt ? svg`<text class="label" x=${e.labelAt.x} y=${e.labelAt.y} text-anchor="middle" dominant-baseline="middle" font-size=${DefaultMetrics.detailFontSize}>${e.label}</text>` : nothing}
        </g>`;
    }

    private renderBox(b: DiagramBox, l: DiagramLayout): TemplateResult {
        const m = DefaultMetrics;
        const cx = b.x + b.w / 2;
        const lineH = m.fontSize * m.lineHeight, detailH = m.detailFontSize * m.lineHeight;
        const textH = b.lines.length * lineH + b.detailLines.length * detailH + (b.detailLines.length ? 4 : 0);
        let y = b.y + (b.h - textH) / 2 + lineH / 2;
        const lines = b.lines.map(t => { const r = svg`<text x=${cx} y=${y} text-anchor="middle" dominant-baseline="middle" font-size=${m.fontSize}>${t}</text>`; y += lineH; return r; });
        y += b.detailLines.length ? 4 : 0;
        const details = b.detailLines.map(t => { const r = svg`<text class="detail" x=${cx} y=${y} text-anchor="middle" dominant-baseline="middle" font-size=${m.detailFontSize}>${t}</text>`; y += detailH; return r; });
        const shape = this.renderShape(b);
        const date = l.type === 'timeline' && b.date !== undefined && l.axis
            ? svg`<text class="date" x=${cx} y=${b.y + b.h / 2 < l.axis.y1 ? l.axis.y1 - 14 : l.axis.y1 + 20} text-anchor="middle" dominant-baseline="middle" font-size=${m.detailFontSize}>${b.date}</text>`
            : nothing;
        return svg`<g class="node ${b.colour ? 'own' : ''}" data-id=${b.id} data-depth=${b.depth} data-shape=${b.shape} style=${b.colour ? `--own-colour: ${b.colour}` : ''}>${shape}${lines}${details}${date}</g>`;
    }

    private renderShape(b: DiagramBox): TemplateResult {
        switch (b.shape) {
            case 'decision': return svg`<polygon class="fill" points="${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w / 2},${b.y + b.h} ${b.x},${b.y + b.h / 2}"></polygon>`;
            case 'start-end': return svg`<rect class="fill" x=${b.x} y=${b.y} width=${b.w} height=${b.h} rx=${b.h / 2} ry=${b.h / 2}></rect>`;
            case 'rounded': return svg`<rect class="fill" x=${b.x} y=${b.y} width=${b.w} height=${b.h} rx="10" ry="10"></rect>`;
            default: return svg`<rect class="fill" x=${b.x} y=${b.y} width=${b.w} height=${b.h} rx="3" ry="3"></rect>`;
        }
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-diagram': JuelDiagram }
}
