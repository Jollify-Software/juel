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

    titleClick(index: number) {
        let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        if (el) {
        /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
        el.classList.toggle("active");
        if (el.classList.contains("active")) {
          $(el).siblings(".title").removeClass("active");
        }
      }
    }

    render() {
        return html`<div class="items ${this.horizontal == true ? "horizontal" : ""}">
            <slot @slotchange="${(e) => this.itemsForSlot(e, 'title')}"></slot>
        </div>`;
    }

}