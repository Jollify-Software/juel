import { LitElement, html, unsafeCSS, nothing, PropertyValueMap } from 'lit'
import { property, customElement } from "lit/decorators";
import styles from 'bundle-text:./RadialMenu.less';
import { RadialMenuDisplayMode } from './RadialMenuDisplayMode';
import { RadialMenuService } from './RadialMenuService';
import { MenuItem } from '../../_Core/MenuItem';
import { ChildrenMap } from '../../_Utils/ChildrenMap';
import { Point } from '../../_Core/Point';
import { until } from 'lit/directives/until';
import { ChildrenItemsTemplate } from '../../_Templates/ChildrenItemsTempate';
import { JuelContainerComponent } from '../../_Base/JuelContainerComponent';
import { when } from 'lit/directives/when';

@customElement("juel-radial-menu")
export class JuelRadialMenu extends JuelContainerComponent {

    angleStart = -360;

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

    service: RadialMenuService;

    static styles = unsafeCSS(styles);

    constructor() {
        super();
        this.mode = RadialMenuDisplayMode.svg;
        this.closeOnClick = true;
        this.size = 400;
        this.buttonOverlay = true;
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        if (this.mode == RadialMenuDisplayMode.svg) {
            this.style.position = 'absolute';
            this.style.width = `${this.size}px`;
            this.style.height = `${this.size}px`;
        }
    }

    // Built lazily on first open(), rather than at firstUpdated(), so that
    // menuItems/onMenuItemClick set programmatically after the element is
    // created (the normal way to configure this component) are picked up
    // instead of an empty snapshot captured before that code ran.
    private ensureService() {
        if (!this.service && this.mode == RadialMenuDisplayMode.svg) {
            this.service = new RadialMenuService({
                parent: this,
                size: this.size,
                closeOnClick: this.closeOnClick,
                menuItems: this.menuItems,
                onClick: this.onMenuItemClick
            });
        }
    }

    itemsCreated(): void {
        let deg = 360 / this.itemsCount;
        let items = this.itemsContainer.querySelectorAll(".item") as NodeListOf<HTMLElement>;
        let i=0;
        for (let item of items) {
            item.style.transform = `rotate(${i*deg}deg)`;
            let content = item.querySelector(".item-content") as HTMLElement;
            if (content) {
                content.style.transform = `rotate(-${i*deg}deg)`
            }
            i++;
        }
    }

    calculateTransform() {

    }

    toggle() {
        this.ensureService();
        $(this.shadowRoot.querySelector(".menu")).toggleClass("open");
        if (this.service) {
            if (this.service.currentMenu) {
                this.close();
            } else {
                this.open();
            }
        }
    }

    render() {
        return html`<div class="menu">
                <div class="items">
                ${until(ChildrenItemsTemplate(this, [...this.children] as HTMLElement[], 0, null, null), nothing)}
                </div>
            </div>
            <div class="button" @click="${() => this.toggle()}"><slot name="button"><span></span></slot></div>`;
    }

    open(ele?: HTMLElement) {
        this.ensureService();
        this.service.open(ele);
    }

    openAt(point: Point, ele?: HTMLElement) {
        this.ensureService();
        this.style.left = `${point.x - (this.size / 2)}px`;
        this.style.top = `${point.y - (this.size / 2)}px`;

        this.service.open(ele);
    }

    close() {
        this.service.close();
    }
}