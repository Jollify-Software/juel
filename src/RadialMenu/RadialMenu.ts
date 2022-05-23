import { LitElement, html, unsafeCSS } from 'lit'
import { property, customElement } from "lit/decorators";
import { MenuItem } from '../_Core/MenuItem';
import { Point } from '../_Core/Point';
import styles from 'bundle-text:./RadialMenu.css';
import { RadialMenuDisplayMode } from './RadialMenuDisplayMode';
import { RadialMenuGridService } from './RadialMenuGridService';
import { RadialMenuService } from './RadialMenuService';
import { ChildrenMap } from '../_Utils/ChildrenMap';
import { JuelComponent } from '../_Base/JuelComponent';

@customElement("juel-radial-menu")
export class JuelRadialMenu extends JuelComponent {

    @property()
    menuItems: MenuItem[] = [];

    @property()
    buttonOverlay: boolean;

    @property()
    mode: RadialMenuDisplayMode;

    @property()
    size: number;
    @property()
    closeOnClick: boolean;
    @property()
    onMenuItemClick: (item: MenuItem) => void;

    gridService: RadialMenuGridService;
    service: RadialMenuService;

    static styles = unsafeCSS(styles);

    constructor() {
        super();
        this.mode = RadialMenuDisplayMode.grid;
        this.closeOnClick = true;
        this.size = 400;
        this.buttonOverlay = true;
    }

    firstLoad() {
            if (this.mode == RadialMenuDisplayMode.grid) {
                this.gridService = new RadialMenuGridService(this);
                this.gridService.init();
            } else if (this.mode == RadialMenuDisplayMode.svg) {
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

    toggle() {
        if (this.gridService) {
            this.gridService.toggle();
        }
    }

    render() {
        return html`${(this.mode == RadialMenuDisplayMode.grid) ?
            html`<div class="menu">
                <div id="items">
            ${ChildrenMap(this, (ele, index) => {
                let id = ele.id ? ele.id : `item-${index}`;
                ele.setAttribute('slot', id);

                return html`
                    <div class="item" data-index="${index}">
                    <slot name="${id}"></slot>
                    </div>`;
            })}
                </div>
            </div>
            <div class="button">${this.buttonOverlay ? html`<slot name="button"><span></span></slot>` : ''}</div>` :
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