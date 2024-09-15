import { customElement, property } from "lit/decorators";
import { FilteredItemBase } from "../_Base/FilteredItemBase";
import { CSSResultGroup, html, unsafeCSS } from "lit";
import Styles from "bundle-text:./Item.less";

@customElement("juel-item")
export class JuelItem extends FilteredItemBase {

    static styles = unsafeCSS(Styles);

    @property()
    title: string

    slotChangeTitle(e: Event) {
        this.title = "true";
    }

    titleSlotChange(e) {

    }

    protected render(): unknown {
        return html`<span part="title" class="title"><slot @slotchange name="title">${this.title}</slot></span>
        <div part="content" class="content"><slot></slot></div>`;
    }
}