import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import style from 'bundle-text:./Grid.less';
import { GridService } from "./GridService";
import { PaginationInfo } from "../_Core/PaginationInfo";
import { DataSource } from "../_Core/DataSource";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { ListResponse } from "../_Core/ListResponse";

@customElement("juel-grid")
export class JuelGrid extends LitElement {

    static styles = unsafeCSS(style);

    service: GridService;
    dataSource: DataSource;

    retrievedDataStr: string[];
    data: any[];

    @property()
    url: string;
    @property({ type: Boolean })
    multi: boolean;
    @property({ type: Number, attribute: "page-size" })
    pageSize: number;

    numPages: number;
    currentPage: number;
    itemTemplate: (obj: any) => Promise<string>;
    get: (pagination: PaginationInfo) => Promise<ListResponse>;

    selected: any[];

    constructor() {
        super();
        this.service = new GridService;
    }

    retrieveData() {
        this.dataSource.retrieveData().then(data => {
            this.data = data;
            if (this.itemTemplate) {
                this.retrievedDataStr = [];
                let p: Promise<void>[] = [];
                for (let itm of data) {
                    p.push(
                        this.itemTemplate(itm).then(str => {
                            this.retrievedDataStr.push(str);
                        })
                    );
                }
                Promise.all(p).then(() => {
                    this.requestUpdate();
                });
            }
        });
    }

    firstUpdated() {
        setTimeout(() => {
            if (this.url || this.get) {
                this.dataSource = new DataSource();
                if (this.url) {
                    this.dataSource.baseUrl = this.url;
                } else {
                    this.dataSource.get = this.get;
                }
                this.dataSource.pagination.pageSize = this.pageSize;
                this.retrieveData();
            }
            this.requestUpdate();
        });
    }

    updated() {
        setTimeout(() => {
            this.service.init(this);
        });
    }

    onNextClick(e) {
        if (e) {
            this.dataSource.pagination.currentPage = e.detail.value;
        }
        this.retrieveData();
    }

    render() {
        let index = -1;
        return html`<div id="container">
        ${document.querySelector('[slot="new"') ? html`<div><slot name="new"></slot></div>` : ``}
        ${!this.dataSource ? ChildrenMap(this, (ele: HTMLElement, i) => {
            index++;
            ele.classList.add("juel-item");
            $(ele).find(".juel-appear").hide();
            let id = ele.id ? ele.id : `item-${i}`;
            ele.setAttribute('slot', id);
            return html`
                    <div class="item" data-index="${index}">
                    <slot name="${id}"></slot>
                    </div>`;
        }, '[slot="new"]') : this.retrievedDataStr ?
                html`${this.retrievedDataStr.map(str => {
                    return unsafeHTML(str);
                })}` : ``
            }</div>${this.dataSource ?
                html`<juel-pagination .pageCount=${Math.round(this.dataSource.pagination.recordCount / this.pageSize)} @next-click="${this.onNextClick}" @previous-click="${this.onNextClick}" @button-click="${this.onNextClick}"></juel-pagination>`
                : ``}`
    }
}