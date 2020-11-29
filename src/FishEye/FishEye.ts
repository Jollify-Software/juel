import { LitElement, customElement, property, html, unsafeCSS } from "lit-element";
import { FishEyeService } from "./FishEyeService";
import styles from 'bundle-text:./FishEye.css';

// TODO: FishEye doesn't work with emoji
// In Service we are animating the width and height
// Instead of this we should just set the scale transform
@customElement("fish-eye")
export class FishEye extends LitElement {

    static styles = unsafeCSS(styles);

        @property()
        closeWidth: 112;
        @property()
        closeHeight: 48;
        @property()
        openWidth: 312;
        @property()
        openHeight: 148;

        service: FishEyeService;

        constructor() {
            super();
            this.service = new FishEyeService(this);
        }

        firstUpdated() {
            this.service.init();
        }

        render() {
            return html`<slot></slot>`;
        }

}