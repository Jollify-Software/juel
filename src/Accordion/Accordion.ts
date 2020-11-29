import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Accordion.css';
import { AccordionService } from "./AccordionService";

@customElement("juel-accordion")
export class DialogManager extends LitElement {

    static styles = unsafeCSS(style);

    service: AccordionService;

    constructor() {
        super();
        this.service = new AccordionService();
    }

    firstUpdated() {
        this.service.init(this.shadowRoot.querySelector("#accordion-container"));
    }

    render() {
        return html`<div id="accordion-container">
            ${(Array.prototype.slice.call(this.children) as HTMLElement[])
                .map((ele, index) => {
                    let id = ele.id ? ele.id :  `accordion-section-${index}`;
                    ele.setAttribute('slot', id);
                    return html`
                        <button>
                            ${(ele.dataset.title ? ele.dataset.title : "")}
                        </button>
                        <div class="panel">
                        <slot name="${id}"></slot>
                        </div>`;
                })}
        </div>`;
    }

}