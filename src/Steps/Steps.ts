import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import { StepsService } from "./StepsService";
import style from 'bundle-text:./Steps.less';

@customElement("juel-steps")
export class JuelSteps extends LitElement {

    static styles = unsafeCSS(style);
    
    service: StepsService;

    constructor() {
        super();
        this.service = new StepsService(this);
    }

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
            setTimeout(() => this.service.init());
        });
    }

    render() {
        let ids: string[] = [];
        return html`<div id="container">
            ${ChildrenMap(this, (ele, index) => {                
                    let id = ele.id ? ele.id :  `step-${index}`;
                    ids.push(id);
                    ele.setAttribute('slot', id);

                    let hasTitleEl = false;
                    let titleElId = `${id}-title`;
                    let titleEl = ele.previousElementSibling;
                    if (titleEl && titleEl.matches('[slot*="title"')) {
                        hasTitleEl = true;
                        titleEl.setAttribute('slot', titleElId);
                    }
                    return html`<div class="title">
                        ${hasTitleEl ?
                            html`<slot name="${titleElId}"></slot>` :
                            html`<span>
                                ${(ele.dataset.title ? ele.dataset.title : "")}
                            </span>`
                        }
                        </div>
                        <div class="step" data-index="${index}">
                        <slot name="${id}"></slot>
                        </div>`;
                }, '[slot*="title"]')}                
            <div id="controls" style="overflow:auto;">
            <div style="float:right;">
            <button type="button" id="prevBtn" @click="${() => this.service.nextPrev(-1)}">Previous</button>
            <button type="button" id="nextBtn" @click="${() => this.service.nextPrev(1)}">Next</button>
            </div>
            </div>
            <div id="indicators">
            ${this.service.numSteps = ids.length, ids.map((id, index) => {
                return html`<span class="step-indicator" data-index="${index}></span>`;
            })}
            </div>
        </div>`;
    }
}