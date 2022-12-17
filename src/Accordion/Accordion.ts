import { html, nothing, PropertyValueMap, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Accordion.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { NavigationBase } from "../_Base/NavigationBase";
import { until } from "lit/directives/until";
import { ChildrenItemsTemplate } from "../_Templates/ChildrenItemsTempate";

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
      console.log("Render")
        return html`<div class="items ${this.horizontal == true ? "horizontal" : ""}">
        ${until(ChildrenItemsTemplate(this, [...this.children] as HTMLElement[], 0, null, null), nothing)}
        </div>`;
    }

}