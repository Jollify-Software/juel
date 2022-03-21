import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Tabs.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";

@customElement("juel-tabs")
export class JuelTabs extends JuelComponent {

    static styles = unsafeCSS(style);
    ids: string[] = [];

    @property({type: Number}) index: number = 0;

    constructor() {
        super();
    }

    displayTab(evt, id) {
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

                let e = new CustomEvent<ChangedEventArgs>(EventNames.Changed, {
                    detail: {
                        index: this.ids.indexOf(id)
                    }
                });
                this.dispatchEvent(e);
            }
        }
    }

    load() {
        this.openTab(this.index);
    }

    openTab(i: number) {
        if (i >= 0 && i < this.ids.length) {
            this.index = i;
            this.displayTab(null, this.ids[this.index]);
        }
    }

    render() {

        return html`<slot name="header"></slot>
            <div id="tabs-container">
            <div id="tabs">
            <div><slot name="prepend"></slot></div>
            ${ChildrenMap(this, (ele, index) => {
                    let id = ele.id ? ele.id : `tab-section-${index}`;
                    ele.setAttribute('slot', id);
                    let hasTitleEl = false;
                    let titleElId: string = `${id}-title`;
                    let titleEl = ele.previousElementSibling as HTMLElement;
                    if (titleEl && titleEl.matches("[slot$='title']")) {
                        hasTitleEl = true;
                        titleEl.setAttribute('slot', titleElId);
                    } 
                    this.ids.push(id);
                    return html`<div id="${titleElId}" class="title" @click="${(evt) => this.displayTab(evt, id)}">
                        ${hasTitleEl ?
                            html`<slot name="${titleElId}"></slot>` :
                            html`<span>
                                ${(ele.dataset.title ? ele.dataset.title : "")}
                            </span>`
                        }
                        `;
                }, '[slot="header"], [slot="footer"], [slot="prepend"], [slot="append"], [slot$="title"]')}
                <div><slot name="append"></slot></div>
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