import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { ColourService } from './ColourService';

import styles from '@simonwep/pickr/dist/themes/nano.min.css';
import Pickr from "@simonwep/pickr";

@customElement("juel-colour")
export class Colour extends LitElement {

    static styles = unsafeCSS(styles);

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

        this.service.init(this.shadowRoot, change);
    }

    render() {
        return html`<div>
          <div id="pickr"></div>
          </div>`;
    }

}