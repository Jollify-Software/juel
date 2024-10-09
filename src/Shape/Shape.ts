import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { DOMStringMapConverter } from "../_Converters/DOMStringMapConvertor";
import { Container, Shape, Svg, SVG, Text } from "@svgdotjs/svg.js";
import bind from "bind-decorator";
import { ShapeTemplateService } from "./Services/ShapeTemplateService";

@customElement("juel-shape")
export class JuelShape extends LitElement {

    @property() type: string;
    @property() src: string;
    @property({ converter: DOMStringMapConverter }) args: object;
    @property({ attribute: "text-attr", converter: DOMStringMapConverter }) textArgs: object;
    @property() text: string;

    draw: Svg;
    container: Container;
    textEl: Text;
    shape: Shape;

    sts: ShapeTemplateService;

    constructor() {
        super();
        this.type = "circle";
        this.args = {
            'fill': 'var(--fill, #E6904B)'
        };
        this.textArgs = {
            'x': '50%',
            'y': '50%',
             'dominant-baseline': "middle",
             'text-anchor': "middle"
        }
    }

    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        $.when($.ready).then(this.ready)
    }

    @bind
    ready() {
        $(this).contents().wrapAll("<span />");
        let templates = this.querySelectorAll("template");
        if (templates) {
            // We do have templates
            this.sts = new ShapeTemplateService(this, Array.from(templates));
        } else if ((!this.shape) && (!this.src)) {
            if (!this.draw) {
                this.draw = SVG().addTo(this).size(this.clientWidth, this.clientHeight)
            }
            switch (this.type) {
                case 'rect':
                    this.shape = this.draw.rect(this.clientWidth, this.clientHeight);
                    break;
                case 'circle':
                    this.shape = this.draw.circle(this.clientWidth);
            }
            
        if (this.shape && this.args) {
            this.shape.attr(this.args);
        }
        } else if (this.src && (!this.shape)) {
            let img = new Image();
            img.src = this.src;
            this.prepend(img);
        }
        if (this.text) {
            if (!this.container) {
                this.container = this.draw.group();
            }
            if (!this.textEl) {
                this.textEl = this.container.add(this.shape).text(this.text);
            }
            this.textEl.attr(this.textArgs);
        }
    }
}