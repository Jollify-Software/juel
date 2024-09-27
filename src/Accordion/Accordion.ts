import { html, PropertyValueMap, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Accordion.less';
import { JuelComponent } from "../_Base/JuelComponent";
import { ListBase } from "../_Base/ListBase";

@customElement("juel-accordion")
export class JuelAccordion extends ListBase {

    static styles = unsafeCSS(style);

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      super.firstUpdated(_changedProperties);
    }

    navigateToSelector(selector: string): void {
      let children = $(this).children().not('[slot*="title"]');
      let el = this.querySelector(selector);
      if (el) {
        let index = children.index(el);
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

    itemsCreated(): void {
        
    }

    render() {
        return html`<div class="items">
        <slot></slot>        
        </div>`;
    }

}