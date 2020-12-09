import { LitElement, customElement, property, html, unsafeCSS } from "lit-element";
import styles from 'bundle-text:./Tooltip.less';

// TODO: FishEye doesn't work with emoji
// In Service we are animating the width and height
// Instead of this we should just set the scale transform
@customElement("juel-tooltip")
export class Tooltip extends LitElement {

    static styles = unsafeCSS(styles);

        @property()
        text: "";

        constructor() {
            super();
        }

        firstUpdated() {
        }

        render() {
            return html`<div class="tooltip"><slot></slot>
            <span>${this.text}</span>
          </div>`;
        }

}