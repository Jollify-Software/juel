import { ListResponse } from "./ListResponse";
import { PaginationInfo } from "./PaginationInfo";

export class DataSource {

    ListEndpoint = "list";

    pagination: PaginationInfo = {};
    baseUrl: string;

    data: any[];

    constructor() {
        this.pagination = {
            currentPage: 1
        };
    }

    buildListUrl() {
        let url = `${this.baseUrl}/${this.ListEndpoint}?currentPage=${this.pagination.currentPage}&pageSize=${this.pagination.pageSize}`;
        return url;
    }

    get(pagination: PaginationInfo): Promise<ListResponse> {
        return fetch(this.buildListUrl())
                .then(response => {
                    return response.json();
                });
    }

    retrieveData(): Promise<any[]> {
        return this.get(this.pagination).then(res => {
            if (res.count) this.pagination.recordCount = res.count;
            this.data = res.data;
            return this.data;
        })
    }
}