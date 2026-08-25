export interface PaginationInfo {
    currentPage?: number
    pageSize?: number
    recordCount?: number
    currentPageToken?: string;
    nextPageToken?: string
    prevPageToken?: string
}