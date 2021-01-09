import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./ScrollPane.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ScrollPaneService } from "./ScrollPaneService";

@customElement("juel-scroll-pane")
export class JuelScrollPane extends LitElement {

    static styles = unsafeCSS(style);

    service = new ScrollPaneService(this);

    @property() position: number = 0;
    @property({ type: Boolean }) vertical: boolean = false;
    @property({ type: Boolean }) auto: boolean = false;
    @property() interval = 3000;
    @property() effect: string = 'fade';
    @property() easing: string = "swing";
    @property() duration: number = 1000;
    @property() control: string = 'move';
    @property() tabs: string;
    @property() random: string;
    @property() next: string;
    @property() previous: string;

    firstUpdated() {
        this.service.init();
    }

    render() {
        return html`<div id="container">
                ${ChildrenMap(this, (el, index) => {
                    let id = el.id ? el.id :  `item-${index}`;
                    el.setAttribute('slot', id);

                    return html`
                        <div class="item" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
                })}
            </div>`;
    }

}