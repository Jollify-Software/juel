import GoldenLayout from "golden-layout";
import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

import style from 'bundle-text:./mdi.less'

import themeBase from "bundle-text:golden-layout/src/css/goldenlayout-base.css";
import themeLight from "bundle-text:golden-layout/src/css/goldenlayout-light-theme.css";
import { IsMobile } from "../_Utils/IsMobile";
import { ChildrenMap } from "../_Utils/ChildrenMap";

@customElement("juel-mdi")
export class Mdi extends LitElement {

    static styles = unsafeCSS(style);

    static themeLightAdded = false;
    static mdiCount = 0;

    config: GoldenLayout.Config;
    layout: GoldenLayout;

    @property()
    order: string = "stack";
    @property({ type: Boolean })
    tabs: boolean = false;

    html: string;

    constructor() {
        super();

        console.log(this.innerHTML)
        if (!('GoldenLayout' in window)) {
            window['GoldenLayout'] = GoldenLayout;
        }
        if (!Mdi.themeLightAdded) {
            let style = document.createElement('style');
            style.textContent = ".lm_root { position: absolute !important; top: 0; }" + unsafeCSS(themeBase).cssText +
                unsafeCSS(themeLight).cssText;
            document.body.prepend(style)
        }
    }

    firstUpdated() {
        if (!this.id) {
            this.id = `mdi-${Mdi.mdiCount}`;
            Mdi.mdiCount++;
        }
        if (IsMobile() || this.tabs == true) {
            return true;
        }

        let savedState = null;//\localStorage.getItem('savedState');


        let content: GoldenLayout.ItemConfigType = {
            type: this.order
        };
        content.content = [];
        let elements: { [id: string]: HTMLElement } = {};
        let childCount = 0;
        for (let child of Array.prototype.slice.call(this.children) as HTMLElement[]) {
            let componentName = (child as HTMLElement).dataset.title ?? "component";
            let component: GoldenLayout.ComponentConfig = {
                id: child.id ? child.id : `${this.id}-${childCount}`,
                type: 'component',
                componentName: componentName
            };
            content.content.push(component);
            elements[componentName] = child;
            childCount++;
        }


        if (savedState !== null) {
            this.config = JSON.parse(savedState);
            this.layout = new GoldenLayout(this.config);
        } else {
            this.config = {};
            this.config.content = [];
            this.config.content.push(content);
            this.layout = new GoldenLayout(this.config);
        }

        console.log(content.content);
        for (let component of content.content) {
            let name = component['componentName']

            this.layout.registerComponent(name, function (container: GoldenLayout.Container, state) {
                let el = $(elements[name]);
                console.log(el[0]);
                (<any>el[0]).container = container;
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
                }
            });
        }
        this.layout.init();

        this.layout.on('stateChanged', () => {
            var state = JSON.stringify(this.layout.toConfig());
            localStorage.setItem('savedState', state);
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