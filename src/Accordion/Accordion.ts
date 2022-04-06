import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Accordion.less';
import { AccordionService } from "./AccordionService";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-accordion")
export class JuelAccordion extends JuelComponent {

    static styles = unsafeCSS(style);

    service: AccordionService;

    @property({ type: String }) size: string;
    @property({ type: Boolean }) horizontal: boolean;
    @property({ type: Boolean }) multiple: boolean;

    constructor() {
        super();
        this.size = "500px";
        this.horizontal = false;
        this.multiple = false;

        this.service = new AccordionService(this);
    }

    load() {
            this.service.init();
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
        return html`<div id="container" class="${this.horizontal == true ? "horizontal" : ""}">
            ${ChildrenMap(this, (ele, index) => {                
                    let id = ele.id ? ele.id :  `accordion-section-${index}`;
                    ele.setAttribute('slot', id);

                    let hasTitleEl = false;
                    let titleElId = `${id}-title`;
                    let titleEl = ele.previousElementSibling;
                    if (titleEl && titleEl.matches('[slot*="title"')) {
                        hasTitleEl = true;
                        titleEl.setAttribute('slot', titleElId);
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