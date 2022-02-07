import { GoldenLayout, ItemType, LayoutConfig, RootItemConfig } from "golden-layout";
import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";

import style from 'bundle-text:./mdi.less'

import themeBase from "bundle-text:golden-layout/dist/css/goldenlayout-base.css";
import themeLight from "bundle-text:golden-layout/dist/css/themes/goldenlayout-light-theme.css";
import { IsMobile } from "../_Utils/IsMobile";
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-mdi")
export class Mdi extends LitElement {

    static styles = unsafeCSS(style);

    static themeLightAdded = false;
    static mdiCount = 0;

    config: LayoutConfig;
    layout: GoldenLayout;

    @property()
    order: ('stack' | 'row' | 'column');
    @property({ type: Boolean })
    tabs: boolean = false;

    html: string;

    constructor() {
        super();

        this.layout = new GoldenLayout();
        this.order = "stack";
        if (!('GoldenLayout' in window)) {
            window['GoldenLayout'] = GoldenLayout;
        }
        if (!Mdi.themeLightAdded) {
            let style = document.createElement('style');
            style.textContent = ".lm_root { position: absolute !important; top: 0; }" + unsafeCSS(themeBase).cssText +
                unsafeCSS(themeLight).cssText;
            document.body.prepend(style)
            Mdi.themeLightAdded = true;
        }
    }

    firstUpdated() {
        setTimeout(() => {
        if (!this.id) {
            this.id = `mdi-${Mdi.mdiCount}`;
            Mdi.mdiCount++;
        }
        if (IsMobile() || this.tabs == true) {
            return true;
        }

        let savedState = null;//\localStorage.getItem('savedState');

        let content: RootItemConfig = {
            type: this.order,
            content: []
        };
        let elements: { [id: string]: HTMLElement } = {};
        let childCount = 0;
        for (let child of Array.prototype.slice.call(this.children) as HTMLElement[]) {
            let componentName = child.dataset.title ?? "component";
            let component: RootItemConfig = {
                id: child.id ? child.id : `${this.id}-${childCount}`,
                type: 'component',
                componentType: componentName
            };
            if (child.dataset.closable && child.dataset.closable == "false") {
                component.isClosable = false;
            }
            content.content.push(component as never);
            elements[componentName] = child;
            childCount++;
        }
        this.config = { root: content, settings: { showCloseIcon: false, showPopoutIcon: false} };

        console.log(this.config);
        for (let component of content.content) {
            let name = component['componentType']

            this.layout.registerComponentFactoryFunction(name, (container, itemConfig) => {
                let el = $(elements[name]);
                (<any>el[0]).container = container;
                container.element.append(el[0])
                /*;
                (container.getElement() as any).html(el);
                let tabs = el.find("[data-tab]");
                if (tabs.length > 0) {
                    tabs.each((index, ele) => {
                        container.on('tab', function (tab) {
                            tab.element.append(ele);
                        });
                    });
                    if (el.find('[data-notify]').length > 0) {
                        (el.find('[data-notify]')[0] as any)
                            .notify('register');
                    }
                }*/
            });
        }
        //this.layout.init();
        
        if (savedState !== null) {
            this.config = JSON.parse(savedState);
            //this.layout = new GoldenLayout(this.config);
        } else { 
            this.layout.loadLayout(this.config);
        }
        
        this.layout.on('stateChanged', () => {
            var state = JSON.stringify(this.layout.toConfig());
            localStorage.setItem('savedState', state);
        });
    });
    }

    render() {
        return html`${
            (this.tabs == true || IsMobile()) ?
            html`<juel-tabs>
            ${ChildrenMap(this, (ele, index) => {
                console.log(ele);
                let id = ele.id ? ele.id :  `item-${index}`;
                let title = ele.dataset.title;
                ele.setAttribute('slot', id);

                return html`
                    <div class="item" data-index="${index}" data-title="${title}">
                    <slot name="${id}"></slot>
                    </div>`;
            })}    
            </juel-tabs>` : ``
        }`;
    }

}