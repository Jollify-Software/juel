import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./ScrollPane.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ScrollPaneService } from "./ScrollPaneService";
import Hammer from 'hammerjs';

@customElement("juel-scroll-pane")
export class JuelScrollPane extends LitElement {

    static styles = unsafeCSS(style);

    service :ScrollPaneService;

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

    firstUpdated() {
        setTimeout(() => {
            console.log("Update!!!")
            this.requestUpdate();

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
            });
    }

    updated() {
        console.log("Update again!!!")
        this.service.init();
    }

    scrollNext(e: Event) {
        e.stopPropagation();
        this.service.next();
    }

    scrollPrevious(e: Event) {
        e.stopPropagation();
        this.service.previous();
    }

    itemClick(e: Event) {
        e.stopPropagation();
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
            console.log("I am here!!!");
            return html`
                        <div class="item" data-index="${index}" draggable="false" @click="${this.itemClick}">
                        <slot name="${id}"></slot>
                        </div>`;
        })}
            </div>
            ${this.controls ? html`<div id="previous" part="previous" @click="${this.scrollPrevious}"><span></span></div>` : ``}`;
    }

}