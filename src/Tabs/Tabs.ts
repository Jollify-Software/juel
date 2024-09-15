import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Tabs.less';
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";
import { NavigationBase } from "../_Base/NavigationBase";
import { ItemBase } from "../_Base/ItemBase";
import { map } from "jquery";
import { unsafeHTML } from "lit/directives/unsafe-html";

@customElement("juel-tabs")
export class JuelTabs extends NavigationBase {

    static styles = unsafeCSS(style);
    ids: string[] = [];
    titles: HTMLElement[] = [];

    @property({type: Number}) index: number;
    @property({type: Boolean}) vertical: boolean;


    constructor() {
        super();
        this.index = 0;
        this.vertical = false;
        this.shouldToggleActive = false;
    }

    addItem(item: ItemBase): void {
        super.addItem(item);
        let index = this.items.findIndex(x => x == item);
        let title = item.shadowRoot.querySelector('.title') as HTMLElement;
        let part = `title-${index}`;
        title.setAttribute('part', 'title ' + part);
        let slot = title.querySelector("slot");
        let assignedElement = slot.assignedElements() as HTMLElement[];
        console.log(title.childElementCount);
        console.log(assignedElement)
        if (assignedElement && assignedElement.length > 0) {
            for (let el of assignedElement) {
                el.setAttribute('slot', part);
            }
        }
        // TODO: If title then remove here else remove on slot changed event
        slot.setAttribute('name', part);
        title.remove();
        this.titles.push(title);
    }

    displayTab(evt, index) {
        // Remove active title
        let currentActive = this.shadowRoot.querySelector('.titles li.active');
        if (currentActive) {
            currentActive.classList.remove('active');
            currentActive.part.remove('active');
        }
        // Remove active item
        currentActive = this.items.find(x => x.matches('.active'));
        if (currentActive) {
            currentActive.classList.remove('active');
            currentActive.part.remove('active');
        }
        // Set active title
        currentActive = this.shadowRoot.querySelector(`.titles li:nth-child(${index + 1})`);
        if (currentActive) {
            currentActive.classList.add('active');
            currentActive.part.add('active');
        }
        // Remove active item
        currentActive = this.items[index];
        if (currentActive) {
            currentActive.classList.add('active');
            currentActive.part.add('active');
        }

                let e = new CustomEvent<ChangedEventArgs>(EventNames.Changed, {
                    detail: {
                        index: this.ids.indexOf(index)
                    }
                });
                this.dispatchEvent(e);
    }

    load() {
        this.openTab(this.index);
        super.load();
    }

    openTab(i: number) {
        if (i >= 0 && i < this.items.length) {
            this.index = i;
            this.displayTab(null, this.index);
        }
    }
    
    render() {

        return html`<slot name="header"></slot>
            <div id="tabs-container" class="${this.vertical ? `vertical` : ``}">
            <div id="tabs">
            <div><slot name="prepend"></slot></div>
            <ul class="titles">${map(this.titles, (ele, i) => html`<li part="title-tab title-tab-${i}" @click=${() => this.openTab(i)}>${unsafeHTML(ele.outerHTML)}</li>`)}</ul>
                <div><slot name="append"></slot></div>
                </div>
                <div class="items"><slot></slot></div>
        </div>
        <slot name="footer"></slot>`;
    }

}