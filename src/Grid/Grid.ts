import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import style from 'bundle-text:./Grid.less';
import { GridService } from "./GridService";

@customElement("juel-grid")
export class JuelGrid extends LitElement {

    static styles = unsafeCSS(style);

    service: GridService;

    @property()
    data: any[];
    @property({ type: Boolean })
    multi: boolean;

    selected: any[];

    constructor() {
        super();
        this.service = new GridService;
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
        });
    }

    updated() {
        setTimeout(() => {
            this.service.init(this);
        });
    }

    render() {
        let index = -1;
        return html`<div id="container">
        ${ChildrenMap(this, (ele: HTMLElement, i) => {
            if (ele.classList.contains("new")) {
                return html`<div class="item"><slot name="new"></slot></div>`;
            } else {
                index++;
                ele.classList.add("juel-item");
                $(ele).find(".juel-appear").hide();
                let id = ele.id ? ele.id :  `item-${i}`;
                ele.setAttribute('slot', id);
                return html`
                    <div class="item" data-index="${index}">
                    <slot name="${id}"></slot>
                    </div>`;
            }
        })}
        </div>`;
    }
}