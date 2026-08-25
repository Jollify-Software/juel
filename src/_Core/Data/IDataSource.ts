import { ListResponse } from "./ListResponse";
import { PaginationInfo } from "./PaginationInfo";

export interface IDataSource {

    ListEndpoint: string; // Do not need??

    pagination: PaginationInfo;
    baseUrl: string;

    get(pagination: PaginationInfo): Promise<ListResponse>;

    retrieveData(): Promise<any[]>;
}