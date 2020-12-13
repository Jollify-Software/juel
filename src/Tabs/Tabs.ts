import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import style from 'bundle-text:./Tabs.less';

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
        for (i = 0; i < tabcontent.length; i++) {
          tabcontent[i].style.display = "none";
        }
      
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = this.shadowRoot.querySelectorAll(".title");
        for (i = 0; i < tablinks.length; i++) {
          tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
      
        // Show the current tab, and add an "active" class to the button that opened the tab
        (this.shadowRoot.querySelector(`#${id}`) as HTMLElement).style.display = "block";
        evt.currentTarget.className += " active";
      } 

    render() {
        return html`<div id="tabs-container">
            <div id="tabs">
            ${(Array.prototype.slice.call(this.children) as HTMLElement[])
                .map((ele, index) => {
                    let id = ele.id ? ele.id :  `tab-section-${index}`;
                    ele.setAttribute('slot', id);

                    let hasTitleEl = false;
                    let titleElId: string;
                    let titleEl = ele.querySelector('[slot="title"]');
                    if (titleEl) {
                        hasTitleEl = true;
                        titleElId = `${id}-title`;
                        titleEl.setAttribute('slot', titleElId);
                        titleEl.remove();
                        ele.parentElement.insertBefore(titleEl, ele);
                    }
                    this.ids.push(id);
                    return html`<div class="title" @click="${(evt) => this.openTab(evt, id)}">
                        ${hasTitleEl ?
                            html`<slot name="${titleElId}"></slot>` :
                            html`<span>
                                ${(ele.dataset.title ? ele.dataset.title : "")}
                            </span>`
                        }
                        `;
                })}
                </div>
                ${this.ids.map(id => {
                    return html`</div>
                        <div id="${id}" class="panel">
                        <slot name="${id}"></slot>
                        </div>`
                })}
        </div>`;
    }

}