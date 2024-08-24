import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { Guid } from "../_Utils/GuidFunction";
import { html, PropertyValueMap } from "lit";
import { Circle, Rect, Shape, Svg, SVG } from '@svgdotjs/svg.js'
import { Point } from "../_Core/Point";
import bind from "bind-decorator";
import { createPopper, Instance } from "@popperjs/core";
import { JuelArea } from "./Area";

@customElement("juel-image-map")
export class JuelImageMap extends JuelComponent {

    @property({ type: String })
    name: string;
    @property({ type: String })
    src: string;
    
    draw: Svg;
    @bind
    getCanvas() { return this.draw }
    
    /**
     *
     */
    constructor() {
        super();
        this.name = Guid();
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.style.position = "relative";
        this.style.display = "inline-block";    
        let img = new Image();
        img.src = this.src;
        img.onload = this.imageLoaded
    }

    @bind
    imageLoaded() {
        let $this = $(this);
        let img = $this.children("img");
        let w = img.width();
        let h = img.height();
        if (w > 0 && h > 0) {
            this.draw = SVG().insertAfter(img[0] as any).css({
                position: "absolute",
                top: "0",
                left: "0"
            }).size(w, h);
            this.updateChildren();
        }
    }

    childUpdated(element: JuelComponent): void {
        if ('getArea' in element) {
            let area = (<JuelArea>element).getArea();
            $(this).children('map').append(area);
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }

    protected render(): unknown {
        return html`<img src="${this.src}" usemap="#${this.name}" /><map name="${this.name}"></map>`;
    }
}