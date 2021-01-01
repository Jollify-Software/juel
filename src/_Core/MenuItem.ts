export interface MenuItem {
    id   : string;
    name: string;
    value: any;
    icon?: string;
    route?: string;
    class?: string;
    selector?:string;
    items?: MenuItem[];
}