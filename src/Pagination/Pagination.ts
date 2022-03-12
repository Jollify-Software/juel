import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { EventNames } from "../_Core/Events/EventNames";
import styles from "bundle-text:./Pagination.less";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";

@customElement("juel-pagination")
export class JuelPagination extends LitElement {
    static styles = unsafeCSS(styles);

    @property({ type: Number }) pageCount: number = 1;
    @property({ type: Number }) currentPage: number = 1;

    constructor() {
        super();
    }

    onPreviousClick(e: Event) {
        this.currentPage --;
        let evt = new CustomEvent<ChangedEventArgs>(EventNames.ButtonClick, {
            detail: {
                value: this.currentPage
            }
        });
        this.dispatchEvent(evt);
    }

    onNextClick(e: Event) {
        this.currentPage ++;
        let evt = new CustomEvent<ChangedEventArgs>(EventNames.ButtonClick, {
            detail: {
                value: this.currentPage
            }
        });
        this.dispatchEvent(evt);
    }

    onButtonClick(e: Event) {
        let target = e.target as HTMLElement;
        let index = parseFloat(target.dataset["index"]);
        this.currentPage = index + 1;
        let evt = new CustomEvent<ChangedEventArgs>(EventNames.ButtonClick, {
            detail: {
                index: index,
                value: this.currentPage
            }
        });
        this.dispatchEvent(evt);
    }

    render() {
        if (this.pageCount && this.pageCount > 0) {
            var ray = [...Array(this.pageCount).keys()];
            return html`<ul class="pagination">
                <button ?disabled=${this.currentPage == 1} @click="${this.onPreviousClick}">Previous</button>
            ${ray ? ray.map((i) => {
                let c= i==this.currentPage-1 ? "page active" : "page";
            return html`<button class="${c}" data-index="${i}" @click="${this.onButtonClick}">${i+1}</button>`;
            }) : ``}
            <button ?disabled=${this.currentPage == this.pageCount} @click="${this.onNextClick}">Next</button>
            </ul>`;
        }
    }
}