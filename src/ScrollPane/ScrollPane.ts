import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from 'bundle-text:./ScrollPane.less';
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { ScrollPaneService } from "./ScrollPaneService";
import Hammer from 'hammerjs';
import { NavigationBase } from "../_Base/NavigationBase";

@customElement("juel-scroll-pane")
export class JuelScrollPane extends NavigationBase {

    static SCROLL: string = "scroll";

    static styles = unsafeCSS(style);

    service: ScrollPaneService;

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

    positionHistory: number[] = [];
    container: HTMLElement;

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
            (<any>window['Hammer']) = Hammer;
        }
    }

    firstLoad() {
        super.firstLoad();
        this.container = this.shadowRoot.querySelector('.container');
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
        //setTimeout(() => this.service.init(), 500);
    }

    reset(resetChildren: boolean = false) {
        this.service.reset(resetChildren);
    }

    navigateTo(index: number): void {
        let el = $(this.container.querySelectorAll(`[data-index="${index}"]`));
        let margin: number = 0;
        let prev = el.prevAll();
        if (prev.length > 0) {
			prev.each((i, sib) => {	
				margin+= (!this.width) ? $(sib).outerWidth() : this.width;
			});
		}
		if (!this.fullHeight) {
			let w = el.outerWidth();
			let h = el.outerHeight();
			if (w > 0) {
				this.style.setProperty('--item-width', w.toString());
			}
			if (window['isMobile'] == false && h > 0) {
				this.style.setProperty('--item-height', h.toString());
			}
		}
		this.container.style.setProperty('--scroll-margin', margin.toString());
	
		this.position = index;

		let evt = new CustomEvent(JuelScrollPane.SCROLL, {
			detail: {
				index: index,
				element: el
			}
		});
		this.positionHistory.push(this.position);
		if (this.positionHistory.length == this.children.length) {
			this.positionHistory = [];
		}
		this.dispatchEvent(evt);
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
            <div class="container">
                ${ChildrenMap(this, (el, index) => {
                    let klass = "item";
            if (index == this.position) {
                klass += " active";
                let $el = $(el);
                let w = $el.outerWidth();
                if (w > 0) {
                    this.style.setProperty('--item-width', w.toString());
                }
                let h = $el.outerHeight();
                if (h > 0) {
                    this.style.setProperty('--item-height', h.toString());
                }
            }
            let id = el.id ? el.id : `item-${index}`;
            el.setAttribute('slot', id);
            el.classList.add("item");
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