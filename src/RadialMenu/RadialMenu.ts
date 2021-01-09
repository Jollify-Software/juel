import { LitElement, html, customElement, property, unsafeCSS } from 'lit-element'
import { MenuItem } from '../_Core/MenuItem';
import { Point } from '../_Core/Point';
import styles from 'bundle-text:./RadialMenu.css';
import { RadialMenuDisplayMode } from './RadialMenuDisplayMode';
import { RadialMenuGridService } from './RadialMenuGridService';
import { RadialMenuService } from './RadialMenuService';
import { ChildrenMap } from '../_Utils/ChildrenMap';

@customElement("radial-menu")
export class RadialMenu extends LitElement {

    @property()
    menuItems: MenuItem[] = [];

    defaultButtonMarkup = html`❌`;

    @property()
    buttonOverlay: boolean = true;

    @property()
    displayMode: RadialMenuDisplayMode = RadialMenuDisplayMode.grid;

    @property()
    size: number = 400;
    @property()
    closeOnClick: boolean = true;
    @property()
    onMenuItemClick: (item: MenuItem) => void;

    gridService: RadialMenuGridService;
    service: RadialMenuService;

    static styles = unsafeCSS(styles);

    constructor() {
        super();
    }

    firstUpdated() {
        if (this.displayMode != RadialMenuDisplayMode.svg) {
        this.init();
        }
    }

    init() {
        if (this.displayMode == RadialMenuDisplayMode.grid) {
            this.gridService = new RadialMenuGridService(this);
            this.gridService.init();
        } else if (this.displayMode == RadialMenuDisplayMode.svg) {
            this.style.position = 'absolute';
            this.style.width = `${this.size}px`;
            this.style.height = `${this.size}px`;
            this.style.display = "none";

            this.service = new RadialMenuService({
                parent: this,
                size: this.size,
                closeOnClick: this.closeOnClick,
                menuItems: this.menuItems,
                onClick: this.onMenuItemClick
            });
        }
/*
        if (this.childElementCount > 0) {
            let children = this.children;
            for (let child of children) {
                child.remove();
                this.shadowRoot.append(child);
            }
        }*/
    }

    render() {
        return html`${(this.displayMode == RadialMenuDisplayMode.grid) ?
            html`<div class="menu">
                <div id="items">
            ${ChildrenMap(this, (ele, index) => {
                let id = ele.id ? ele.id :  `item-${index}`;
                ele.setAttribute('slot', id);

                return html`
                    <li class="item" data-index="${index}">
                    <slot name="${id}"></slot>
                    </li>`;
            })}
                </div>
            </div>
            <div class="button">${this.buttonOverlay ? html`<slot name="button">${this.defaultButtonMarkup}</slot>` : ''}</div>` :
            ``}`;
    }

    open(ele?: HTMLElement) {
        this.service.open(ele);
    }

    openAt(point: Point, ele?: HTMLElement) {
        this.style.left = `${point.x - (this.size / 2)}px`;
        this.style.top = `${point.y - (this.size / 2)}px`;

        this.service.open(ele);
    }

    close() {
        this.service.close();
    }
}