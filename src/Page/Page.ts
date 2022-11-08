import { html, unsafeCSS } from "lit";
import { customElement } from "lit/decorators";
import Styles from 'bundle-text:./Page.less';
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-page")
export class JuelPage extends JuelComponent {

    static styles = unsafeCSS(Styles);

    load() {
        let header = this.shadowRoot.querySelector("header");
        let footer = this.shadowRoot.querySelector("footer");

        if (footer && header) {
            let offset = $(header).outerHeight() + $(footer).outerHeight();
            this.style.setProperty("--main-height", `calc((var(--vh) * 100) - ${offset}px`)
        } else if (footer) {
            let offset = footer.clientHeight;
            this.style.setProperty("--main-height", `calc((var(--vh) * 100) - ${offset}px`)
        } else if (header) {
            let offset = header.clientHeight;
            this.style.setProperty("--main-height", `calc((var(--vh) * 100) - ${offset}px`)
        }
    }

    protected render(): unknown {
        return html`<header><slot name="header"></slot></header>
        <aside id="left-side"><slot name="left"></aside><article><slot name="main"></slot></article><aside id="right-side"><slot name="right"></slot></aside>
        <footer><slot name="footer"></slot></footer>`;
    }
}