import { LitElement, customElement, property, html, unsafeCSS } from "lit-element";
import tippy from 'tippy.js';
import styles from 'bundle-text:tippy.js/dist/tippy.css';
import tooltipStyles from 'bundle-text:./Tooltip.less';

@customElement("juel-tooltip")
export class Tooltip extends LitElement {

    static styles = unsafeCSS(tooltipStyles);
    static stylesSet = false;

    @property()
    text: "";

    constructor() {
        super();
        if (!Tooltip.stylesSet) {
            let style = document.createElement('style');
            style.textContent = unsafeCSS(styles).cssText;
            document.body.prepend(style);
            Tooltip.stylesSet = true;
        }
    }

    firstUpdated() {
        let el = this.shadowRoot.getElementById('tip');
        let contentEl = this.querySelector('[slot="content"]');
        let content: any = this.text;
        let interact = false;
        let trigger: any;

        if (contentEl) {
            content = contentEl;
            interact = true;
            trigger = "click";
        }

        tippy(el, {
            content: content,
            appendTo: this,
            trigger: trigger,
            interactive: interact
        });
    }

    render() {
        return html`<div id="tip"><slot></slot>
          </div>`;
    }

}