import { LitElement, html } from "lit";
import { property, customElement } from "lit/decorators";
import { ParallaxService } from "./ParallaxService";

@customElement("juel-parallax")
export class Parallax extends LitElement {

    @property()
    width: number = 500;
    @property()
    height: number = 500;
    @property()
    control: string = "mouse"
    @property()
    patten: string = "bounds"
    @property() interval: number = 6000;
    @property() spacing: number = 4;
    @property() limit: string = "xy";
    @property() limitIndex: number;
    @property() snap: boolean;

    service: ParallaxService;
    
    constructor() {
        super();
        this.service = new ParallaxService(this);
    }

    firstUpdated() {
        this.service.init();
    }

    render() {
        return html`
        <style>
        :host { width: ${this.width}px; height: ${this.height}px;}
        </style>
        <slot></slot>`;
    }
}