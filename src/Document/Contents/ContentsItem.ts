export interface ContentsItem {
    id: string;
    title: string;
    page?: number;
    children?: ContentsItem[];
}