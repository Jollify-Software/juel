import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./ScrollPane.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ScrollPaneService } from "./ScrollPaneService";
import Hammer from 'hammerjs';
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-scroll-pane")
export class JuelScrollPane extends JuelComponent {

    static SCROLL: string = "scroll";

    static styles = unsafeCSS(style);

    service: ScrollPaneService;

    @property() position: number;
    @property({ type: Boolean }) vertical: boolean;
    @property({ type: Boolean }) auto: boolean;
    @property() interval;
    @property() effect: string;
    @property() easing: string;
    @property() duration: number;
    @property({ type: Boolean }) controls: boolean;
    @property() tabs: string | HTMLCollection;
    @property() random: string;
    @property() next: string | HTMLElement;
    @property() previous: string | HTMLElement;
    @property({ type: Number }) master: number;
    @property({ type: Number }) width: number;
    @property({ type: Boolean }) autoHeight: boolean;
    @property({ type: Boolean }) fullHeight: boolean;

    constructor() {
        super();
        this.service = new ScrollPaneService(this);
        this.master = 0;
        this.width = null;
        this.position = 0;
        this.vertical = false;
        this.auto = false;
        this.interval = 3000;
        this.effect = 'fade';
        this.easing = "swing";
        this.duration = 1000;
        this.controls = false;

        if (!('Hammer' in window)) {
            window['Hammer'] = Hammer;
        }
    }

    firstLoad() {
        let mc = new Hammer(this);
        mc.on('swipe', (e) => {
            // Left = 2
            if (e.direction == 2) {
                this.service.next();
                // Right == 4
            } else if (e.direction == 4) {
                this.service.previous();
            }
        });

        this.service.init();
        //setTimeout(() => this.service.init());
    }

    reset(resetChildren: boolean = false) {
        this.service.reset(resetChildren);
    }

    scrollIndex(index: number) {
        this.service.scrollTo(index);
    }

    scrollNext(e: Event) {
        if (e) {
            e.stopPropagation();
        }
        this.service.next();
    }

    scrollPrevious(e: Event) {
        if (e) {
            e.stopPropagation();
        }
        this.service.previous();
    }

    itemClick(e: Event) {
        if (e) {
            e.stopPropagation();
        }
        // TODO Despatch custom event
    }

    render() {
        return html`${this.controls ? html`<div id="next" part="next" @click="${this.scrollNext}"><span></span></div>` : ``}
            <div id="container">
                ${ChildrenMap(this, (el, index) => {
            let id = el.id ? el.id : `item-${index}`;
            el.setAttribute('slot', id);
            el.setAttribute('draggable', 'false');
            el.setAttribute('ondragstart', "event.preventDefault();")
            return html`
                        <div class="item" data-index="${index}" draggable="false" @click="${this.itemClick}">
                        <slot name="${id}"></slot>
                        </div>`;
        })}
            </div>
            ${this.controls ? html`<div id="previous" part="previous" @click="${this.scrollPrevious}"><span></span></div>` : ``}`;
    }

}