import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { AreaShape } from "./AreaShape";
import { PropertyValueMap, PropertyValues } from "lit";
import { Circle, Rect, Shape, Svg } from "@svgdotjs/svg.js";
import { Point } from "../_Core/Point";
import { JuelImageMap } from "./ImageMap";
import bind from "bind-decorator";
import { TooltipService } from "../_Services/TooltipService";
import { PopupService } from "../_Services/PopupService";

@customElement("juel-area")
export class JuelArea extends JuelComponent {
    @property({ type: String })
    shape: AreaShape;
    @property({ type: String })
    alt: string;
    @property({ type: String })
    rel; // TODO: export type
    @property({ type: String })
    href: string;
    @property()
    target: string;
    @property({ type: String })
    coords: string;

    area: HTMLAreaElement
    @bind
    getArea() { return this.area; }

    tooltipService: TooltipService;
    popupService: PopupService;

    /**
     *
     */
    constructor() {
        super();
        this.tooltipService = new TooltipService();
        this.popupService = new PopupService();
    }
    
    protected updated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        let draw: Svg;
        if ('getCanvas' in this.parentElement &&
            (draw = (this.parentElement as unknown as JuelImageMap).getCanvas())
        ) {
            this.createArea();
        let shape: Shape;
        let coords = this.coords.split(",").map(x => parseFloat(x));
        switch (this.shape) {
            case "rect":
                shape = this.drawRect(draw,
                    { x: coords[0], y: coords[1] },
                    { x: coords[2], y: coords[3] }
                );
                break;
            case "circle":
                shape = this.drawCircle(draw,
                    { x: coords[0], y: coords[1]},
                    coords[2]
                );
                break;
            case "poly":
                shape = this.drawPoly(draw, coords);
            default:
                break;
        }

            this.setupAlt(shape);
            if (this.childElementCount > 0) {
                let children: HTMLElement[] = this.getChildren();
                let bounds = shape.rbox()
                let cp = { x: bounds.width / 2, y: bounds.height / 2 };
                shape.click(e => {
                    this.popupService.popup(children, cp);
                });
            } else if (this.href) {
                shape.click(e => {
                    if (this.target == "_blank") {
                        window.open(this.href);
                    } else {
                        location.href = this.href;
                    }
                });
            }
/*
        if (area.hasAttribute("href")) {
            let href = area.href;
            // If href is an element then display that element in a popper
            if (href.includes('#')) {
                href = '#' + href.split('#')[1]
                let el = document.querySelector(href) as HTMLElement;
                if (el) {
                // If rel=tooltip
                shape.click(e => {
                    this.popup = createPopper(this.virtualElement as any, el);
                    el.style.display = "inline-block";
                    this.popupElement = el;
                });
            }
                // Default && rel=lightbox
            } else {
                // If target blank
                shape.click(e => {
                    window.location.href = href;    
                });
            }
        }*/
        /*
        
       */
    }
        super.updated(_changedProperties);
    }

    createArea() {
        this.area = document.createElement('area');
        this.area.alt = this.alt;
        this.area.shape = this.shape;
        this.area.rel = this.rel;
        this.area.href = this.href;
        this.area.coords = this.coords;
    }

    drawRect(draw : Svg, p1: Point, p2: Point): Rect {
        let x = Math.min(p1.x, p2.x);
        let y = Math.min(p1.y, p2.y);
        let w = Math.abs(p2.x - p1.x);
        let h = Math.abs(p2.y - p1.y);

        return draw.rect(w, h).move(x, y).addClass("reveal").fill("lightblue");
    }

    drawCircle(draw: Svg, p: Point, r: number): Circle {
        return draw.circle(r * 2).move(p.x - r, p.y - r).addClass("reveal").fill("lightblue");
    }

    drawPoly(draw: Svg, coords: number[]) {
        return draw.polygon(coords).addClass("reveal").fill("lightblue")
    }

    setupAlt(shape: Shape) {
        if (this.alt) {
            shape.mousemove(e => {
                this.tooltipService.tooltip(this.alt, e);
            });
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}