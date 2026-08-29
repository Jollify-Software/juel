import { html, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import style from 'bundle-text:./TileContainer.less';
import Hammer from 'hammerjs';
import { JuelDataComponent } from "../../_Base/JuelDataComponent";
import { DomReady } from "../../_Utils/DomReady";
import { FillTemplate } from "../../_Utils/FillTemplate";
import { Dispatch } from "../../_Core/DispatchFunction";
import { TileContainerEvents } from "./TileContainerEvents";

@customElement("juel-tile-container")
export class JuelTileContainer extends JuelDataComponent {

    static styles = unsafeCSS(style);

    @property({ type: String, reflect: true }) direction: 'horizontal' | 'vertical' = 'vertical';
    @property({ type: Boolean }) touch: boolean = true;

    @state() private dragging = false;

    private tilesEl: HTMLElement;
    private hammer: any;
    // Panning re-assigns scrollTop/scrollLeft by hand (see initTouch), so an
    // ordinary click with a couple of pixels of incidental mouse movement —
    // completely normal — crosses Hammer's pan threshold too, scrolling the
    // tiles out from under the pointer mid-click and firing the resulting
    // click on whatever tile the pointer ends up over instead (usually the
    // adjacent one). Track whether the current pointer gesture actually
    // dragged, and swallow the click that follows one.
    private didDrag = false;

    constructor() {
        super();
        if (!('Hammer' in window)) {
            (window as any)['Hammer'] = Hammer;
        }
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        // juel.js loads in <head>, so this element upgrades and first-renders
        // before the parser has reached its own light-DOM children (same
        // timing issue as JuelScrollPane) — wait for parsing to finish, then
        // re-render so DOM-child tiles are picked up, before wiring touch.
        DomReady().then(() => {
            this.requestUpdate();
            this.updateComplete.then(() => {
                this.tilesEl = this.shadowRoot.querySelector('#tiles');
                if (this.touch) {
                    this.initTouch();
                }
            });
        });
    }

    ready(): void {
        // Deliberately not calling super.ready(): JuelContainerComponent's
        // version calls selectItem(0) against a shadow `.items` element this
        // component never creates — tiles render via their own light-DOM /
        // data-bound path below instead.
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
        }
    }

    private initTouch() {
        if (!this.tilesEl || this.hammer) {
            return;
        }
        let horizontal = this.direction === 'horizontal';
        let mc = new Hammer(this.tilesEl);
        mc.get('pan').set({ direction: horizontal ? Hammer.DIRECTION_HORIZONTAL : Hammer.DIRECTION_VERTICAL });
        let startLeft = 0;
        let startTop = 0;
        // A new gesture starts clean; panstart only fires once movement
        // crosses Hammer's threshold, so didDrag has to reset earlier than
        // that to correctly allow a plain click that never drags at all.
        this.tilesEl.addEventListener('pointerdown', () => {
            this.didDrag = false;
        }, true);
        this.tilesEl.addEventListener('click', (e) => {
            if (this.didDrag) {
                e.stopPropagation();
            }
        }, true);
        mc.on('panstart', () => {
            this.dragging = true;
            startLeft = this.tilesEl.scrollLeft;
            startTop = this.tilesEl.scrollTop;
        });
        mc.on('panmove', (e) => {
            if (e.distance > 3) {
                this.didDrag = true;
            }
            if (horizontal) {
                this.tilesEl.scrollLeft = startLeft - e.deltaX;
            } else {
                this.tilesEl.scrollTop = startTop - e.deltaY;
            }
        });
        mc.on('panend pancancel', () => {
            this.dragging = false;
        });
        this.hammer = mc;
    }

    private onTileClick(e: Event, index: number, value?: any) {
        Dispatch(this, TileContainerEvents.TileClick, { index: index, value: value, originalEvent: e });
    }

    private async renderDataTiles() {
        await this.templatePromise;
        if (!this.data || this.data.length === 0) {
            return html``;
        }
        return html`${this.data.map((value, index) => html`
            <div class="tile" part="tile" data-index="${index}" @click=${(e: Event) => this.onTileClick(e, index, value)}>
                ${FillTemplate(this.template, value)}
            </div>`)}`;
    }

    render() {
        let children = [...this.children].filter(el => el.nodeName !== 'TEMPLATE') as HTMLElement[];
        let hasChildren = children.length > 0;
        return html`
            <div id="tiles" part="tiles" class="tiles ${this.dragging ? 'dragging' : ''}">
                ${hasChildren
                    ? children.map((el, index) => {
                        let id = el.id || `tile-${index}`;
                        el.setAttribute('slot', id);
                        return html`<div class="tile" part="tile" data-index="${index}" @click=${(e: Event) => this.onTileClick(e, index)}>
                            <slot name="${id}"></slot>
                        </div>`;
                    })
                    : until(this.renderDataTiles(), html``)}
            </div>
        `;
    }
}
