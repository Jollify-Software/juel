import { html, TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./DataGrid.less';
import { PaginationInfo } from "../../_Core/Data/PaginationInfo";
import { DataSource } from "../../_Core/Data/DataSource";
import { ListResponse } from "../../_Core/Data/ListResponse";
import { YouTubeDataSource } from "../../_Core/Data/YouTubeDataSource";
import { IDataSource } from "../../_Core/Data/IDataSource";
import { when } from "lit/directives/when";
import { until } from "lit/directives/until";
import { ChildrenItemsTemplate } from "../../_Templates/ChildrenItemsTempate";
import { ListItemsTemplate } from "../../_Templates/ListItemsTemplate";
import { JuelDataComponent } from "../../_Base/JuelDataComponent";

@customElement("juel-data-grid")
export class JuelDataGrid extends JuelDataComponent {

    static styles = unsafeCSS(style);

    dataSource: IDataSource;

    @property() url: string;
    @property() list: string;
    @property() provider: string;
    @property() method: string;
    @property() query: string;
    @property() key: string;
    @property({ type: Number, attribute: "page-size" })
    pageSize: number;
    @property({ type: Boolean })
    input: boolean;

    retrieve: (pagination: PaginationInfo) => Promise<ListResponse>;

    constructor() {
        super();
        this.pageSize = 40;
    }

    ready(): void {
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
            this.retrieveData();
        }
    }

    refresh() {
        this.retrieveData();
    }

    retrieveData() {
        this.dataSource.retrieveData().then(data => {
            this.data = data;
            this.requestUpdate();
            if (this.itemTemplate) {
                this.retrievedDataStrings = [];
                let p: Promise<void>[] = [];
                for (let value of data) {
                    p.push(
                        this.itemTemplate(value).then(str => {
                            this.retrievedDataStrings.push(str);
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

    get pageCount(): number {
        if (!this.dataSource || !this.dataSource.pagination.recordCount) {
            return 1;
        }
        return Math.max(1, Math.ceil(this.dataSource.pagination.recordCount / this.pageSize));
    }

    onPageChange(page: number) {
        if (page < 1 || page > this.pageCount) {
            return;
        }
        let pagination = this.dataSource.pagination;
        if (page > pagination.currentPage && pagination.nextPageToken) {
            pagination.currentPageToken = pagination.nextPageToken;
        } else if (page < pagination.currentPage && pagination.prevPageToken) {
            pagination.currentPageToken = pagination.prevPageToken;
        }
        pagination.currentPage = page;
        this.retrieveData();
    }

    render() {
        let children = [...this.children] as HTMLElement[];
        let hasChildren = children.length > 0 &&
            !children.some(el => el.matches('[slot="new"]') || el.matches('template'));
        let newEl = this.querySelector('[slot="new"]');
        let hasNew = newEl != null;

        return html`${when(this.input, () => html`<input type="text" @input="${e => this.onInput(e)}" />`)}
        <div class="items" part="items">
        ${when(hasNew, () => html`<div class="item"><slot name="new"></slot></div>`)}
        ${when(hasChildren,
            () => html`${until(ChildrenItemsTemplate(this, [...this.children] as HTMLElement[], 0, null, null, '[slot="new"]'))}`,
            () => until(ListItemsTemplate(this)))}
        </div>${this.dataSource ? html`
        <div class="pagination" part="pagination">
            <button type="button" ?disabled=${this.dataSource.pagination.currentPage <= 1} @click=${() => this.onPageChange(this.dataSource.pagination.currentPage - 1)}>&laquo; Prev</button>
            <span class="page-info">Page ${this.dataSource.pagination.currentPage} of ${this.pageCount}</span>
            <button type="button" ?disabled=${this.dataSource.pagination.currentPage >= this.pageCount} @click=${() => this.onPageChange(this.dataSource.pagination.currentPage + 1)}>Next &raquo;</button>
        </div>` : ``}`
    }
}
