import GoldenLayout from "golden-layout";
import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

import style from 'bundle-text:./mdi.less'

import themeBase from "bundle-text:golden-layout/src/css/goldenlayout-base.css";
import themeLight from "bundle-text:golden-layout/src/css/goldenlayout-light-theme.css";
import { IsMobile } from "../_Utils/IsMobile";

@customElement("juel-mdi")
export class Mdi extends LitElement {

    static styles = unsafeCSS(style);

    static themeLightAdded = false;

    config: GoldenLayout.Config;
    goldenLayout: GoldenLayout;

    @property()
    layout: string = "stack";
    @property()
    mobileTabs: boolean = true;

    constructor() {
        super();
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
        console.log(IsMobile())
        if (IsMobile() && this.mobileTabs) {
            return true;
        }
        this.config = {};
        this.config.content = [];

        let content: GoldenLayout.ItemConfigType = {
            type: this.layout
        };
        content.content = [];
        let elements = {};
        for (let child of Array.prototype.slice.call(this.children) as HTMLElement[]) {
            let componentName = (child as HTMLElement).dataset.title ?? "component";
            let component: GoldenLayout.ComponentConfig = {
                type: 'component',
                componentName: componentName
            };
            content.content.push(component);
            elements[componentName] = child;
        }
        this.config.content.push(content);
            this.goldenLayout = new GoldenLayout(this.config);

        for (let component of content.content) {
            let name = component['componentName']
            this.goldenLayout.registerComponent(name, function(container, state) {
                container.getElement().html($(elements[name]))
            });
        }
        this.goldenLayout.init();
    }

    render() {
        return html`${IsMobile() && this.mobileTabs ?
            html`<juel-tabs>
                ${(() => {
                    let h = this.innerHTML;
                    this.innerHTML = "";
                    return unsafeHTML(h)
                })()}
            </juel-tabs>` :
            ``
        }
        `;
    }

}