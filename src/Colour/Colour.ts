import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { ColourService } from './ColourService';

import styles from 'bundle-text:@simonwep/pickr/dist/themes/nano.min.css';
import Pickr from "@simonwep/pickr";

@customElement("juel-colour")
export class Colour extends LitElement {

    static styles = unsafeCSS(styles);

    @property() value: string;

    service: ColourService;

    constructor() {
        super();
        this.service = new ColourService();
    }

    firstUpdated() {
        let change = (colour: Pickr.HSVaColor, instance: Pickr) => {
            let event = new CustomEvent('change', {
                detail: {
                    colour: colour,
                    instance: instance
                }
            });
            this.dispatchEvent(event);
        }

        this.service.init(this.shadowRoot, this.value, change);
    }

    setColour(colour: string) {
        console.log(this.service)
        this.service.pickr.setColor(colour);
    }

    render() {
        return html`<div id="pickr"></div>`;
    }

}