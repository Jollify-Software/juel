import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./Tabs.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-tabs")
export class Tabs extends LitElement {

    static styles = unsafeCSS(style);
    ids: string[] = [];

    constructor() {
        super();
    }

    openTab(evt, id) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tabcontent" and hide them
        tabcontent = this.shadowRoot.querySelectorAll(".panel");
        if (tabcontent) {
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }

            // Get all elements with class="tablinks" and remove the class "active"
            tablinks = this.shadowRoot.querySelectorAll(".title");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            // Show the current tab, and add an "active" class to the button that opened the tab
            let el = (this.shadowRoot.querySelector(`#${id}`) as HTMLElement);
            console.log(id)
            if (el) {
                el.style.display = "block";
                if (evt && evt.target) {
                    evt.target.className += " active";
                } else {
                    let tab = (this.shadowRoot.querySelector(`#${id}-title`) as HTMLElement);
                    if (tab) {
                        tab.className += " active";
                    }
                }
            }
        }
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
        });
    }

    updated() {
        this.openTab(null, this.ids[0]);
    }

    render() {
        //this.ids = [];
        return html`<slot name="header"></slot>
            <div id="tabs-container">
            <div id="tabs">
            ${ChildrenMap(this, (ele, index) => {
                    let id = ele.id ? ele.id : `tab-section-${index}`;
                    ele.setAttribute('slot', id);

                    let hasTitleEl = false;
                    let titleElId: string = `${id}-title`;
                    let titleEl = ele.querySelector('[slot="title"]');
                    if (titleEl) {
                        hasTitleEl = true;
                        titleEl.setAttribute('slot', titleElId);
                        titleEl.remove();
                        ele.parentElement.insertBefore(titleEl, ele);
                    }
                    this.ids.push(id);
                    console.log("Here " + id)
                    return html`<div id="${titleElId}" class="title" @click="${(evt) => this.openTab(evt, id)}">
                        ${hasTitleEl ?
                            html`<slot name="${titleElId}"></slot>` :
                            html`<span>
                                ${(ele.dataset.title ? ele.dataset.title : "")}
                            </span>`
                        }
                        `;
                }, '[slot="title"]')}
                </div>
                ${this.ids.map(id => {
                    return html`</div>
                        <div id="${id}" class="panel">
                        <slot name="${id}"></slot>
                        </div>`
                })}
        </div>
        <slot name="footer"></slot>`;
    }

}