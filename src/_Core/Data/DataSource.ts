import { IDataSource } from "./IDataSource";
import { ListResponse } from "./ListResponse";
import { PaginationInfo } from "./PaginationInfo";

export class DataSource implements IDataSource {

    ListEndpoint: string; // Do not need??

    pagination: PaginationInfo = {};
    baseUrl: string;

    data: any[];

    constructor() {
        this.pagination = {
            currentPage: 1,
            pageSize: 40
        };
    }

    buildListUrl() {
        let url = `${this.baseUrl}${!this.baseUrl.includes('?') ? '?' : '&' }currentPage=${this.pagination.currentPage}&pageSize=${this.pagination.pageSize}`;
        return url;
    }

    get(pagination: PaginationInfo): Promise<ListResponse> {
        // credentials: 'include',
        //         mode: 'cors'
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