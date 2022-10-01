import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { when } from "lit/directives/when";
import { JuelComponent } from "../_Base/JuelComponent";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Carousel.less';

@customElement("juel-carousel")
export class JuelCarousel extends JuelComponent {
    static styles = unsafeCSS(Styles);

    @property() position: number;
    @property() controls: string; // TODO: CControl: 5s, 500ms
    // TODO: Indicators, transition: zoom(in|out)|fade, previous/next slots

    itemsCount: number;
    interval: number;
    intervalHandler: number;
    isForward: boolean; // The direction the carousel is going

    constructor() {
        super();
        this.position = 0;
        this.controls = "true";
    }

    navigateTo(index: number) {
        /* Find the current card */
        const currItm = $(this.shadowRoot.querySelector(`[data-index="${index}"]`));
        if (currItm) {
            /* Set the prevCard based on its availability */
            currItm.siblings(".item").removeClass("active");
            currItm.addClass("active");
            this.style.setProperty('--item-width', currItm.outerWidth().toString());
            this.style.setProperty('--item-height', currItm.outerHeight().toString());
        }
    }

    firstLoad(): void {
        if (this.controls.includes(' ')) {
            let splity = this.controls.split(' ');
            // 1st is true|false
            this.setInterval(splity[0]);
        } else {
            this.setInterval(this.controls);
        }
        if (this.interval) {
            this.intervalHandler = setInterval(() => {
                this.next(null);
            }, this.interval);
        }
    }

    setInterval(str: string) {
        if (str.endsWith('ms')) {
            this.interval = parseInt(str.replace('ms', ''));
        } else if (str.endsWith('s')) {
            this.interval = parseInt(str.replace('s', '')) * 1000;
        }
    }

    prev(e) {
        this.isForward = false;
        if (this.position == 0) {
            this.position = this.itemsCount - 1;
        } else {
            this.position--;
        }
        this.navigateTo(this.position);
    }

    next(e) {
        this.isForward = true;
        if (e && this.intervalHandler) {
            clearInterval(this.intervalHandler);
        }
        if (this.position == this.itemsCount - 1) {
            this.position = 0;
        } else {
            this.position++;
        }
        this.navigateTo(this.position);
    }

    itemClick(e: Event) {
        if (e) {
            e.stopPropagation();
        }
        // TODO Despatch custom event
    }

    render() {
        let hasCtrls: boolean = this.controls.includes("true");
        this.itemsCount = 0;
        return html`${when(hasCtrls, () => html`<juel-button label="&lt;" @button-clicked="${this.prev}"></juel-button>`)}
        <div class="container">
        ${ChildrenMap(this, (el, index) => {
            this.itemsCount++;
            let id = el.id ? el.id : `item-${index}`;
            let klass = "item";
            if (index == this.position) {
                klass += " active";
                let $el = $(el);
                this.style.setProperty('--item-width', $el.outerWidth().toString());
                this.style.setProperty('--item-height', $el.outerHeight().toString());
            }
            let hasTitleEl = false;
            let titleElId = `${id}-caption`;
            let titleEl = el.nextElementSibling;
            if (titleEl && titleEl.matches('[slot*="caption"')) {
                hasTitleEl = true;
                titleEl.setAttribute('slot', titleElId);
            }
            el.setAttribute('slot', id);
            el.setAttribute('draggable', 'false');
            el.setAttribute('ondragstart', "event.preventDefault();")
            return html`
                        <div class="${klass}" data-index="${index}" draggable="false" @click="${this.itemClick}">
                        <slot name="${id}"></slot>
                        ${when(hasTitleEl, () => html`<div class="caption"><slot name="${titleElId}"</div>`)}
                        ${when(el.hasAttribute("data-caption"), () => html`<div class="caption">${el.dataset.caption}</div>`)}
                        </div>`;
        }, '[slot*="caption"]')}
        </div>
        ${when(hasCtrls, () => html`<juel-button label="&gt;" @button-clicked="${this.next}"></juel-button>`)}`;
    }
}