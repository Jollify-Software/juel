import { html, unsafeCSS, nothing } from "lit";
import { customElement } from "lit/decorators";
import style from 'bundle-text:./List.less';
import { when } from "lit/directives/when";
import { ListBase } from "../_Base/ListBase";
import { ListItemsTemplate } from "../_Templates/ListItemsTemplate";

@customElement("juel-list")
export class JuelList extends ListBase {

    static styles = unsafeCSS(style);

    constructor() {
        super();
    }

    render() {
        return html`<div id="list">
            ${when(this.input,
                () => html`<input type="text" @input="${e => this.onInput(e)}">`,
                () => nothing)}
            ${ListItemsTemplate(this)}
        </div>`;
    }

}