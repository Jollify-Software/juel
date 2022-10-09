import { html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Accordion.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { NavigationBase } from "../_Base/NavigationBase";

@customElement("juel-accordion")
export class JuelAccordion extends NavigationBase {

    static styles = unsafeCSS(style);

    @property({ type: String }) size: string;
    @property({ type: Boolean }) horizontal: boolean;
    @property({ type: Boolean }) multiple: boolean;

    constructor() {
        super();
        this.size = "500px";
        this.horizontal = false;
        this.multiple = false;
    }

    navigateToSelector(selector: string): void {
      let children = $(this).children().not('[slot*="title"]');
      let el = this.querySelector(selector);
      if (el) {
        let index = children.index(el);
        console.log(index)
        if (index >= 0) {
          this.navigateToIndex(index);
        }
      }
    }

    navigateToIndex(index: number) {
      let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
      if (el) {
        el.classList.toggle("active");
        if (el.classList.contains("active")) {
          $(el).siblings(".title").removeClass("active");
        }
      }
    }

    titleClick(e: Event) {
        let el = e.target as HTMLElement;
        /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
        el.classList.toggle("active");
        if (el.classList.contains("active")) {
          $(el).siblings(".title").removeClass("active");
        }
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
                        if (titleEl.hasAttribute("id") && ele.hasAttribute("id") == false) {
                          ele.id = titleEl.id;
                          titleEl.removeAttribute("id");
                        }
                    }
                    return html`<div class="title" data-index="${index}" @click="${this.titleClick}">
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