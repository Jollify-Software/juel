import { customElement } from "lit/decorators";
import { FilteredItemBase } from "../_Base/FilteredItemBase";
import { CSSResultGroup, html, unsafeCSS } from "lit";
import Styles from "bundle-text:./GridItem.less";

@customElement("juel-grid-item")
export class JuelGridItem extends FilteredItemBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);
    
    protected render(): unknown {
        return html`<slot></slot>`
    }
}