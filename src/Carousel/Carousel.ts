import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { when } from "lit/directives/when";
import { JuelComponent } from "../_Base/JuelComponent";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Carousel.less';
import { NavigationBase } from "../_Base/NavigationBase";

@customElement("juel-carousel")
export class JuelCarousel extends NavigationBase {
    static styles = unsafeCSS(Styles);

    @property() controls: string; // TODO: CControl: 5s, 500ms
    // TODO: Indicators, transition: zoom(in|out)|fade, previous/next slots

    interval: number;
    intervalHandler: number;
    isForward: boolean; // The direction the carousel is going

    constructor() {
        super();
        this.position = 0;
        this.controls = "true";
    }

    navigateTo(index: number) {
        this.selectItem(index);
        /* Find the current card */
        // const currItm = $(this.shadowRoot.querySelector(`[data-index="${index}"]`));
        // if (currItm && currItm.length > 0) {
        //     /* Set the prevCard based on its availability */
        //     currItm.siblings(".item").removeClass("active");
        //     currItm.addClass("active");

        //     let w = currItm.outerWidth();
        //     if (w > 0) {
        //         this.style.setProperty('--item-width', w.toString());
        //     }
        //     let h = currItm.outerHeight();
        //     if (h > 0) {
        //         this.style.setProperty('--item-height', h.toString());
        //     }
        // }
    }

    navigateToSelector(selector: string): void {
        let el = this.querySelector(selector);
        if (el) {
            let children = $(this).children().not('[slot*="caption"]');
            let index = children.index(el);
            if (index >= 0) {
                this.position = index;
                this.navigateTo(index);
            }
            //let index = Array.prototype.indexOf.call(this.children, el);
        }
    }

    firstUpdated(): void {
        super.firstUpdated()
        if (this.controls.includes(' ')) {
            let splity = this.controls.split(' ');
            // 1st is true|false
            this.setInterval(splity[1]);
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
        console.log("Items: " + this.itemsCount)
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
        return html`${when(hasCtrls, () => html`<div id="previous" @click="${this.prev}"><span></span></div>`)}
        <div class="items container"><slot @slotchange="${(e) => this.itemsForSlot(e, 'caption', true)}"></slot></div>
        ${when(hasCtrls, () => html`<div id="next" @click="${this.next}"><span></span></div>`)}`;
    }
}