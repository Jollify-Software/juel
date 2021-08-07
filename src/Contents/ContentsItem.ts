export interface ContentsItem {
    id: string;
    title: string;
    children?: ContentsItem[];
}