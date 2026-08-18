import { html, LitElement, unsafeCSS } from "lit-element";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./ScrollPane.less';
import { ChildrenMap } from "../../_Utils/ChildrenMap";
import { ScrollPaneService } from "./ScrollPaneService";
import { DomReady } from "../../_Utils/DomReady";
import Hammer from 'hammerjs';

@customElement("juel-scroll-pane")
export class JuelScrollPane extends LitElement {

    static styles = unsafeCSS(style);

    service = new ScrollPaneService(this);

    @property({ type: Number }) index: number = 0;
    @property({ type: Boolean }) vertical: boolean = false;
    @property({ type: Boolean }) auto: boolean = false;
    @property({ type: Number }) interval = 3000;
    @property() effect: string = 'fade';
    @property() easing: string = "swing";
    @property({ type: Number }) duration: number = 1000;
    @property({ type: Boolean }) controls: boolean = false;
    @property({ type: Boolean }) swipe: boolean = false;
    @property() tabs: string | HTMLCollection;
    @property() random: string;
    @property() next: string | HTMLElement;
    @property() previous: string | HTMLElement;

    @property({ type: Number }) master = 0;
    @property({ type: Number }) width = null;

    constructor() {
        super();
        if (!('Hammer' in window)) {
            (window as any)['Hammer'] = Hammer;
        }
    }

    firstUpdated() {
        // juel.js loads in <head>, so this element upgrades and first-renders
        // before the parser has even reached its own light-DOM children (the
        // slotted items) — ChildrenMap sees zero children at that point. Wait
        // for the document to finish parsing, then re-render so ChildrenMap
        // picks them up, before measuring/wiring anything.
        DomReady().then(() => {
            this.requestUpdate();
            this.updateComplete.then(() => {
                this.service.init();

                if (this.swipe) {
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
                }
            });
        });
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
            return html`
                        <div class="item" data-index="${index}" draggable="false" @click="${this.itemClick}">
                        <slot name="${id}"></slot>
                        </div>`;
        })}
            </div>
            ${this.controls ? html`<div id="previous" part="previous" @click="${this.scrollPrevious}"><span></span></div>` : ``}`;
    }

}