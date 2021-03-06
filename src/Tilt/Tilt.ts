import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import VanillaTilt from "vanilla-tilt";
import Styles from 'bundle-text:./Tilt.less';
import { JuelComponent } from "../_Base/JuelComponent";


@customElement("juel-tilt")
export class JuelTilt extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property({ type: Number })
    perspective = 250;

    firstLoad() {
        let el = this.shadowRoot.getElementById('tilt');
        VanillaTilt.init(el, {
            perspective: this.perspective
        });
        if (this.childElementCount > 1) {
            el.style.transformStyle = 'preserve-3d';
        }
    }

    render() {
        return html`<div id="tilt">
            <slot></slot>
        </div>`;
    }

}