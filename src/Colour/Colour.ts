import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { ColourService } from './ColourService';

import styles from 'bundle-text:@simonwep/pickr/dist/themes/nano.min.css';
import Pickr from "@simonwep/pickr";

@customElement("juel-colour")
export class Colour extends LitElement {

    static styles = unsafeCSS(styles);

    @property() context: any;
    @property() property: string = "colour";
    @property() value: string = "black";

    service: ColourService;

    constructor() {
        super();
        this.service = new ColourService();
    }

    firstUpdated() {
        if (this.context in window) {
            this.context = window[this.context];
        }
        let change = (source: EventSource, instance: Pickr) => {
            this.value = instance.getColor().toRGBA().toString();
            if (this.context && this.property) {
                this.context[this.property] = this.value;
            }
            let event = new CustomEvent('change', {
                detail: {
                    colour: this.value
                }
            });
            this.dispatchEvent(event);
        }

        this.service.init(this.shadowRoot, this.value, change);
    }

    setColour(colour: string) {
        this.value = colour;
        this.service.pickr.setColor(colour);
    }

    render() {
        return html`<div id="pickr"></div><div id="container"></div>`;
    }

}