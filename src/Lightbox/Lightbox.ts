import { customElement, html, LitElement, unsafeCSS } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
import { JuelScrollPane } from "../ScrollPane/ScrollPane";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Lightbox.less";

@customElement("juel-lightbox")
export class JuelLightbox extends LitElement {

    static styles = unsafeCSS(Styles);

    scrollPane: JuelScrollPane;

    firstUpdated() {
        setTimeout(() => {
            this.scrollPane = this.shadowRoot.getElementById("scroll") as JuelScrollPane;
            this.scrollPane.next = this.shadowRoot.getElementById("next");
            this.scrollPane.previous = this.shadowRoot.getElementById("previous");

            this.scrollPane.tabs = this.shadowRoot.getElementById("tabs").children;

            this.requestUpdate();
        });
    }

    render() {
        return html`
            <div id="container">
                <div id="header">
                    <div id="close">
                    </div>
                </div>
                <div id="content">
                    <button id="previous">
                        <span></span>
                    </button>
                    <button id="next">
                        <span></span>
                    </button>
                    <juel-scroll-pane id="scroll">
                    ${ChildrenMap(this, (el, index) => {
                        el.setAttribute("ondragstart", "return false;");
                        return html`${unsafeHTML(el.outerHTML)}`;
                    })}
                    </juel-scroll-pane>
                </div>
                <ul id="tabs">
                    ${ChildrenMap(this, (el, index) => {
                        return html`<li>Banana</li>`;
                    })}
                </ul>
            </div>
        `;
    }
}