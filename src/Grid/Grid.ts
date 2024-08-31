import { customElement } from "lit/decorators";
import { FilteredBase } from "../_Base/FilteredBase";
import { CSSResultGroup, html, unsafeCSS } from "lit";
import Styles from "bundle-text:./Grid.less";
import { when } from "lit/directives/when";

@customElement("juel-grid")
export class JuelGrid extends FilteredBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    protected render(): unknown {
        return html`${when(this.filters == "true", () => this.renderFilters())}<div class="items"><slot></slot></div>`
    }
}