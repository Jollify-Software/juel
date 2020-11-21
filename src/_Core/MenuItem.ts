export interface MenuItem {
    id   : string;
    name: string;
    icon?: string;
    route?: string;
    class?: string;
    selector?:string;
    items?: MenuItem[];
}