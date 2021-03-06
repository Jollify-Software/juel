export interface MenuItem {
    id   : string;
    name: string;
    value: any;
    action: () => string;
    icon?: string;
    route?: string;
    class?: string;
    selector?:string;
    items?: MenuItem[];
}