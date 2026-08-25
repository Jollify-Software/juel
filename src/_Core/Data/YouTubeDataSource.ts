import { JuelGrid } from "../../Grid/Grid";
import { IDataSource } from "./IDataSource";
import { ListResponse } from "./ListResponse";
import { PaginationInfo } from "./PaginationInfo";
import { YouTubePlaylistListResponse } from "./YouTubePlaylistListRespponse";

const Url_Playlist = "https://www.googleapis.com/youtube/v3/playlists"

export class YouTubeDataSource implements IDataSource {

    ListEndpoint: string; // Do not need??

    pagination: PaginationInfo = {};
    baseUrl: string;

    data: any[];

    constructor(private ele: JuelGrid) {
        switch (ele.method) {
            case "playlist":
                this.ListEndpoint = Url_Playlist;
                break;
        }
    }

    get(pagination: PaginationInfo): Promise<ListResponse> {
        let query = `?key=${this.ele.key}&maxResults=${pagination.pageSize}`;
        if (pagination.currentPageToken) {
            query += `&pageToken=${pagination.currentPageToken}`
        }
        if (this.ele.query) {
            query += `&${this.ele.query.replace(';', '&')}`;
        }
        return fetch(`${this.ListEndpoint}${query ? query : ''}`).then(response => {
            return new Promise(resolve => {
                response.json().then(json => {
                    var list = json as YouTubePlaylistListResponse;
                    if ("nextPageToken" in json) {
                        this.pagination.nextPageToken = list.nextPageToken;
                    }
                    if ("prevPageToken" in json) {
                        this.pagination.prevPageToken = list.prevPageToken;
                    }
                    // TODO: process each list.item, add url() and drillDown() methods
                    // TODO: Case type, process differently
                    let res: ListResponse = {
                        data: list.items,
                        count: list.pageInfo.totalResults
                    };
                    resolve(res);
                });
            });

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