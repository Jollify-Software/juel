import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Accordion.less';
import { AccordionService } from "./AccordionService";
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-accordion")
export class JuelAccordion extends LitElement {

    static styles = unsafeCSS(style);

    service: AccordionService;

    @property({ type: String }) size = "200px";
    @property({ type: Boolean }) vertical: boolean = false;
    @property({ type: Boolean }) multiple = false;

    constructor() {
        super();
        this.service = new AccordionService(this);
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
            setTimeout(() => this.service.init());
        });
    }

    titleClick(e: Event) {
        let el = e.target as HTMLElement;
        /* Toggle between adding and removing the "active" class,
              to highlight the button that controls the panel */
              el.classList.toggle("active");
          
              /* Toggle between hiding and showing the active panel 
              var panel = this.nextElementSibling as HTMLElement;
              if (panel.style.display === "block") {
                panel.style.display = "none";
              } else {
                panel.style.display = "block";
              }
              if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
              } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
              }
              */
    }

    render() {
        return html`<div id="container" class="${this.vertical == true ? "" : "horizontal"}">
            ${ChildrenMap(this, (ele, index) => {                
                    let id = ele.id ? ele.id :  `accordion-section-${index}`;
                    ele.setAttribute('slot', id);

                    let hasTitleEl = false;
                    let titleElId = `${id}-title`;
                    let titleEl = ele.previousElementSibling;
                    if (titleEl && titleEl.matches('[slot*="title"')) {
                        hasTitleEl = true;
                        titleEl.setAttribute('slot', titleElId);
                        //titleEl.remove();
                        //ele.parentElement.insertBefore(titleEl, ele);
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
                }, '[slot*="title"]')}
        </div>`;
    }

}