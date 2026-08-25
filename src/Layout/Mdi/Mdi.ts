import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";

import style from 'bundle-text:./mdi.less'

import { IsMobile } from "../../_Utils/IsMobile";
import { ChildrenMap } from "../../_Utils/ChildrenMap";
import { DomReady } from "../../_Utils/DomReady";
import "../Splitter/Splitter";
import "../../Navigation/Tabs/Tabs";

// A dependency-free multi-document layout (replaces the golden-layout
// integration this component originally used). 'stack' renders each child as
// a juel-tab; 'row'/'column' arrange children side by side or stacked,
// resizable via juel-splitter. Mobile always falls back to tabs, same as the
// original design.
@customElement("juel-mdi")
export class JuelMdi extends LitElement {

    static styles = unsafeCSS(style);

    @property()
    order: ('stack' | 'row' | 'column') = 'stack';
    @property({ type: Boolean })
    tabs: boolean = false;

    private useTabs(): boolean {
        return this.tabs || IsMobile() || this.order === 'stack';
    }

    firstUpdated() {
        // Children declared in the light DOM may not be parsed and appended
        // yet at the first render (this element can upgrade mid-parse), so
        // re-render once the document is fully ready.
        DomReady().then(() => this.requestUpdate());
    }

    render() {
        if (this.useTabs()) {
            return html`<juel-tabs>${ChildrenMap(this, (ele, index) => {
                let id = ele.id ? ele.id : `item-${index}`;
                let title = ele.dataset.title ?? `Panel ${index + 1}`;
                ele.setAttribute('slot', id);
                return html`<juel-tab title="${title}"><slot name="${id}"></slot></juel-tab>`;
            })}</juel-tabs>`;
        }

        return html`<juel-splitter ?vertical=${this.order === 'column'}>${ChildrenMap(this, (ele, index) => {
            let id = ele.id ? ele.id : `item-${index}`;
            let title = ele.dataset.title ?? `Panel ${index + 1}`;
            ele.setAttribute('slot', id);
            return html`<div class="pane">
                <div class="pane-title">${title}</div>
                <div class="pane-body"><slot name="${id}"></slot></div>
            </div>`;
        })}</juel-splitter>`;
    }
}
