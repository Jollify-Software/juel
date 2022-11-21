import { CSSResultGroup, html, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { Factory, FactoryOptions, Formatter, RenderContext, Renderer, Stave } from "vexflow";
import { JuelComponent } from "../_Base/JuelComponent";
import Style from "bundle-text:./Music.less";

@customElement("juel-music")
export class JuelMusic extends JuelComponent {

    static styles?: CSSResultGroup = unsafeCSS(Style);

    @property({ type: Number }) width: number;
    @property({ type: Number }) height: number;

    factory: Factory;

    renderer: Renderer;
    context: RenderContext;
    formatter: Formatter;
    staves: Stave[];

    constructor() {
        super();
        this.width = 500;
        this.height = 500;
        this.staves = [];
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        let el = this.shadowRoot.querySelector(".output") as HTMLDivElement;
        this.renderer = new Renderer(el, Renderer.Backends.SVG);
        this.context = this.renderer.getContext();
        this.formatter = new Formatter();
    }

    render() {
        return html`<div class="output"></div>`;
    }
}