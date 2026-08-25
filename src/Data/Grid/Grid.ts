import { html, LitElement, PropertyValueMap, TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { ChildrenMap } from "../../../juel/src/_Utils/ChildrenMap";
import style from 'bundle-text:./Grid.less';
import { GridService } from "./GridService";
import { PaginationInfo } from "../_Core/Data/PaginationInfo";
import { DataSource } from "../_Core/Data/DataSource";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { ListResponse } from "../_Core/Data/ListResponse";
import { JuelHttpComponent } from "../_Base/JuelHttpComponent";
import { YouTubeDataSource } from "../_Core/Data/YouTubeDataSource";
import { IDataSource } from "../_Core/Data/IDataSource";
import { FillTemplate } from "juel/src/_Utils/FillTemplate";
import { when } from "lit/directives/when";
import { ChangedEventArgs } from "juel/src/_Core/Events/ChangedEventArgs";
import { until } from "lit/directives/until";
import { ChildrenItemsTemplate } from "juel/src/_Templates/ChildrenItemsTempate";
import { ListItemsTemplate } from "juel/src/_Templates/ListItemsTemplate";

@customElement("juel-grid")
export class JuelGrid extends JuelHttpComponent {

    static styles = unsafeCSS(style);

    service: GridService;
    dataSource: IDataSource;

    retrievedDataStr: Array<string | TemplateResult>;
    data: any[];

    @property() provider: string;
    @property() method: string;
    @property() query: string;
    @property() key: string;
    @property({ type: Boolean })
    multi: boolean;
    @property({ type: Number, attribute: "page-size" })
    pageSize: number;

    numPages: number;
    currentPage: number;
    @property() itemTemplate: (value: any) => Promise<string | TemplateResult>;
    retrieve: (pagination: PaginationInfo) => Promise<ListResponse>;

    selected: any[];

    constructor() {
        super();
        this.pageSize = 40;
        this.service = new GridService;
    }

    protected ready(): void {
        console.log(this.retrieve)
        if (this.url || this.retrieve || this.provider) {
            if (this.provider && this.provider == "youtube") {
                this.dataSource = new YouTubeDataSource(this);
            } else {
                this.dataSource = new DataSource();
            }
            if (this.url) {
                this.dataSource.baseUrl = this.url;
                if (this.list) {
                    this.dataSource.ListEndpoint = this.list;
                }
            } else if (!this.provider) {
                this.dataSource.get = this.retrieve;
            }
            this.dataSource.pagination.pageSize = this.pageSize;
            console.log("Now retrieveing data");
            this.retrieveData();
        }
    }

    refresh() {
        this.retrieveData();
    }

    retrieveData() {
        this.dataSource.retrieveData().then(data => {
            this.data = data;
            console.log(this.data)
            this.requestUpdate();
            if (this.itemTemplate) {
                this.retrievedDataStr = [];
                let p: Promise<void>[] = [];
                for (let value of data) {
                    p.push(
                        this.itemTemplate(value).then(str => {
                            this.retrievedDataStr.push(str);
                        })
                    );
                }
                Promise.all(p).then(() => {
                    this.requestUpdate();
                });
            } else {
                this.requestUpdate();
            }
        });
    }

    onPageChange(e: CustomEvent<ChangedEventArgs>) {
        if (e) {
            // Page forward
            if (e.detail.value > this.dataSource.pagination.currentPage &&
                this.dataSource.pagination.nextPageToken) {
                    this.dataSource.pagination.currentPageToken = this.dataSource.pagination.nextPageToken;
            } else if (e.detail.value < this.dataSource.pagination.currentPage &&
                this.dataSource.pagination.nextPageToken) { // Page backwards
                    this.dataSource.pagination.currentPageToken = this.dataSource.pagination.prevPageToken;
            }
            this.dataSource.pagination.currentPage = e.detail.value;
        }
        this.retrieveData();
    }

    render() {
        let children = [...this.children] as HTMLElement[];
        let hasChildren = children.length > 0 &&
            !children.some(el => el.matches('[slot="new"]') || el.matches('template'));
        let newEl = this.querySelector('[slot="new"]');
        let hasNew = newEl != null;
        console.log("Has children " + hasChildren)
        let index = -1;
        return html`${when(this.input, () => html`<input type="text" @input="${e => this.onInput(e)}" />`)}
        <div class="items" part="items">
        ${when(hasNew, () => html`<div class="item"><slot name="new"></slot></div>`)}
        ${when(hasChildren,
            () => html`${until(ChildrenItemsTemplate(this, [...this.children] as HTMLElement[], 0, null, null, '[slot="new"]'))}`,
            () => until(ListItemsTemplate(this)))}
        </div>${this.dataSource ?
                html`<juel-pagination .pageCount=${Math.round(this.dataSource.pagination.recordCount / this.pageSize)} @next-click="${this.onPageChange}" @previous-click="${this.onPageChange}" @button-click="${this.onPageChange}"></juel-pagination>`
                : ``}`
    }
}