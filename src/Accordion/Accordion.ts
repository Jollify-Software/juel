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

                    let hasTitleEl = false;
                    let titleElId: string;
                    let titleEl = ele.querySelector('[slot="title"]');
                    if (titleEl) {
                        hasTitleEl = true;
                        titleElId = `${id}-title`;
                        titleEl.setAttribute('slot', titleElId);
                        titleEl.remove();
                        ele.parentElement.insertBefore(titleEl, ele);
                    }

                    return html`<div class="title">
                        ${hasTitleEl ?
                            html`<slot name="${titleElId}"></slot>` :
                            html`<span>
                                ${(ele.dataset.title ? ele.dataset.title : "")}
                            </span>`
                        }
                        </div>
                        <div class="panel">
                        <slot name="${id}"></slot>
                        </div>`;
                })}
        </div>`;
    }

}