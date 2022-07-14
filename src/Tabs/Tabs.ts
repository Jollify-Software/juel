import { html, TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Tabs.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { JuelComponent } from "../_Base/JuelComponent";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";
import { when } from "lit/directives/when";

@customElement("juel-tabs")
export class JuelTabs extends JuelComponent {

    static styles = unsafeCSS(style);
    ids: string[] = [];

    @property({type: Number}) index: number;
    @property({type: Boolean}) vertical: boolean;

    constructor() {
        super();
        this.index = 0;
        this.vertical = false;
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
                tablinks[i].classList.remove("active");
            }

            // Show the current tab, and add an "active" class to the button that opened the tab
            let el = (this.shadowRoot.querySelector(`#${id}`) as HTMLElement);
            if (el) {
                el.style.display = "block";
                if (evt && evt.target) {
                    evt.target.classList.add("active");
                } else {
                    let tab = (this.shadowRoot.querySelector(`#${id}-title`) as HTMLElement);
                    if (tab) {
                        // TODO: What about group within a group?
                        let group = tab.closest(".group");
                        if (group) {
                            group.classList.add("open");
                        }
                        tab.classList.add("active");
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

    childrenMap(level: number) {
        return (el: HTMLElement, index: number) => {
            let result: TemplateResult[] = [];
            let id = el.id ? el.id : `tab-section-${level == 0 ? index : `${level}-${index}`}`;
            el.setAttribute('slot', id);
            if (level > 0) {
                el.remove();
                this.append(el);
            }
            let titleClass = "title";
            let hasTitleEl = false;
            let titleElId: string = `${id}-title`;
            let titleEl = el.previousElementSibling as HTMLElement;
            if (titleEl && titleEl.matches("[slot$='title']")) {
                hasTitleEl = true;
                titleEl.setAttribute('slot', titleElId);
                if (level > 0) {
                    titleEl.remove();
                    this.append(titleEl);
                }
            }
            let children = el.children;
            let hasChildTabs: boolean;
            let hasContent: boolean = true;;
            for (let child of children) {
                if (child.matches("[data-title], [slot$='title']")) {
                    hasChildTabs = true;
                    hasContent = false;
                } else {
                    hasContent = true;
                }
            }
            let event: (e: Event) => void;
            if (hasContent) {
                this.ids.push(id);
                event = (e) => {
                  e.stopPropagation();
                  this.displayTab(e, id);
                };
            } else {
                titleClass += " group";
                event = (e) => {
                    let el = (<HTMLElement>e.target)
                    el.closest(".group").classList.toggle("open");
                };
            }
            return html`<div id="${titleElId}" has-content="${hasContent}" class="${titleClass}" @click="${event}">
                ${hasTitleEl ?
                    html`<slot name="${titleElId}"></slot>` :
                    html`<span>
                        ${(el.dataset.title ? el.dataset.title : "")}
                    </span>`
                }
                ${when(hasChildTabs, () => ChildrenMap(el, this.childrenMap(level + 1),
                    '[slot="header"], [slot="footer"], [slot="prepend"], [slot="append"], [slot$="title"]'))}
                </div>`;
        }
    }

    render() {

        return html`<slot name="header"></slot>
            <div id="tabs-container" class="${this.vertical ? `vertical` : ``}">
            <div id="tabs">
            <div><slot name="prepend"></slot></div>
            ${ChildrenMap(this, this.childrenMap(0),
                '[slot="header"], [slot="footer"], [slot="prepend"], [slot="append"], [slot$="title"]')}
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