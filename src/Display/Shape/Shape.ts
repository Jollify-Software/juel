import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { Container, Path, Shape, Svg, SVG, Text } from "@svgdotjs/svg.js";
import bind from "bind-decorator";
import { ShapeTemplateService } from "./Services/ShapeTemplateService";
import { ShapeStrategies, ShapeStrategy } from "./ShapeStrategies/ShapeStrategy";
import { getSlottedElements } from "../../_Utils/dom/GetSlottedElements";
import Styles from 'bundle-text:./Shape.less';
import { IconsModule } from "../../_Modules/Icons/IconsModule";
import { svgToClipPath } from "../../_Utils/draw/svgToClipPath";
import { extractPoints } from "../../_Utils/draw/extractPoint";
import { normalizePoints } from "../../_Utils/draw/normalizePoints";
import { polygonStrToPath } from "../../_Utils/draw/polygonToPath";
import { CompassPositions } from "../../_Core/CompassPositions";

@customElement("juel-shape")
export class JuelShape extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() type: string;
    @property() src: string;
    @property({ type: String }) direction: string = CompassPositions.North;
    @property({ converter: DOMStringMapConverter }) args: object;
    @property({ attribute: "text-attr", converter: DOMStringMapConverter }) textArgs: object;
    @property() text: string;
    @property() hover: string;

    draw: Svg;
    container: Container;
    textEl: Text;
    shape: Shape;
    initialShape: Shape;
    initialShapeCopy: Shape;
    svgContainerRef: HTMLDivElement;
    isPath: boolean = false;

    sts: ShapeTemplateService;
    private resizeObserver: ResizeObserver;

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


    protected render(): unknown {
        return html`<span class="content"><slot></slot></span><div part="shape" class="svg-container rotate ${this.direction}"></dov>`;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        $.when($.ready).then(this.ready);

        // Initialize ResizeObserver
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this);
    }

    @bind
    ready() {
        this.svgContainerRef = this.shadowRoot.querySelector("div.svg-container");
        let slot = this.shadowRoot.querySelector("slot") as HTMLSlotElement;
        let slottedElements = getSlottedElements(slot);
        let templates = slottedElements.filter(x => x.nodeName.toLowerCase() == "template") as HTMLTemplateElement[];
        if (templates.length > 0) {
            // We do have templates
            this.sts = new ShapeTemplateService(this, templates);
        } else if ((!this.shape) && (!this.src)) {
            this.setDefaultStyles();

            if (!this.draw) {
                this.draw = SVG();
                this.draw.addTo(this.svgContainerRef).viewbox(0, 0, this.clientWidth, this.clientHeight);
            }
            this.drawShape();

            if (this.shape && this.args) {
                this.shape.attr(this.args);
            }
            if (this.hover) {

                    const [normalizedInitial, normalizedTarget] = normalizePoints(this.initialShape, this.shape);
                    console.log(normalizedInitial, normalizedTarget);
                    this.initialShape = normalizedInitial;
                    this.shape = normalizedTarget;
                
                    this.addEventListener("mouseenter", () => {
                        if (!this.initialShapeCopy) {
                            this.initialShapeCopy = this.initialShape.clone();
                        }
                            const targetPoints = extractPoints(this.shape);
                            this.initialShape.animate(1000).plot(targetPoints);
                    });
                    this.addEventListener("mouseleave", () => {
                            const targetPoints = extractPoints(this.initialShapeCopy);
                            this.initialShape.animate(1000).plot(targetPoints);
                    });
            }
        }
        if (this.src) {
            if (this.draw) {
                this.draw.image(this.src);
            } else {
                let img = new Image();
                img.src = this.src;
                this.shadowRoot.prepend(img);
            }
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

    private handleResize() {
        if (this.shape) {
            const width = this.clientWidth;
            const height = this.clientHeight;

            // Scale the shape to match the new dimensions
            this.shape.size(width, height);
        }
        if (this.draw) {
            this.draw.size(this.clientWidth, this.clientHeight);
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    private setDefaultStyles() {
        let fill = this.style.getPropertyValue("--fill");
        if (!fill) {
            this.style.setProperty("--fill", "#E6904B");
        }
        let stroke = this.style.getPropertyValue("--stroke");
        if (!stroke) {
            this.style.setProperty("--stroke", "black");
        }
    }

    private drawShape() {
        if (this.draw && this.type) {
            if (this.type in ShapeStrategies) {
                let strategy = ShapeStrategies[this.type] as ShapeStrategy;
                this.shape = strategy.draw(this.draw, this.clientWidth, this.clientHeight);
            } else { // Type not in shapeStrategies
                let svg = IconsModule.get(this.type);
                if (svg) {
                    this.shape = this.draw.svg(svg);
                }
            }
            if (this.hover) {
                if (this.shape.type !== "svg") {
                    this.shape.remove();
                } else {
                    this.isPath = true;
                }
                // Initial shape: A rectangle covering the full SVG area
                const initialShape = `${this.clientWidth},0 ${this.clientWidth},${this.clientHeight} 0,${this.clientHeight} 0,0`;
                    this.initialShape = this.draw.polygon(initialShape).fill('#ffcc00');
                
            }
        }
    }

    addCenteredText() {
        let size = Math.max(this.clientWidth, this.clientHeight);
        const center = size / 2;
        this.draw
            .text(this.text)
            .font({ size: 16, anchor: 'middle', fill: '#ffffff' })
            .center(center, center);
    }
}