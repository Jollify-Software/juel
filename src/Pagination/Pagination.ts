import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { EventNames } from "../_Core/Events/EventNames";
import styles from "bundle-text:./Pagination.less";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";

@customElement("juel-pagination")
export class JuelPagination extends LitElement {
    static styles = unsafeCSS(styles);

    @property({ type: Number }) pageCount: number = 0;
    constructor() {
        super();
    }

    onPreviousClick(e: Event) {
        let evt = new CustomEvent(EventNames.PreviousClick);
        this.dispatchEvent(evt);
    }

    onNextClick(e: Event) {
        let evt = new CustomEvent(EventNames.NextClick);
        this.dispatchEvent(evt);
    }

    onButtonClick(e: Event) {
        let target = e.target as HTMLElement;
        let evt = new CustomEvent<ChangedEventArgs>(EventNames.ButtonClick, {
            detail: {
                index: parseFloat(target.dataset["index"])
            }
        });
        this.dispatchEvent(evt);
    }

    render() {
        return html`<ul class="pagination">
            <li class="page-item" @click="${this.onPreviousClick}">Previous</li>
        ${[...Array(this.pageCount).keys()].map((i) => {
          return html`<li class="page" data-index="${i}" @click="${this.onButtonClick}">${i+1}</li>`;
        })}
          <li class="page-item" @click="${this.onNextClick}">Next</li>
        </ul>`;
    }
}