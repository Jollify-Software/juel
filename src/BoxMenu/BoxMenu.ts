import { customElement, LitElement, property, html } from "lit-element";
import { BoxMenuService } from "./BoxMenuService";

@customElement("box-menu")
export class BoxMenu extends LitElement {

    @property() slice: number = 1;
    @property() span: number = 2;
    @property() width: number = 100;
    @property() height: number = 100;
    @property() type: string = "cascade";
    @property() pattern: string = "zigzag";
    @property() duration: string = "fast";
    @property() direction: string = "right";

    service: BoxMenuService;

    constructor() {
        super();
        this.service = new BoxMenuService(this)
    }

    firstUpdated() {
        console.log("Hello")
        this.service.init();
    }

    render() {
        return html`<slot></slot>`;
    }
}