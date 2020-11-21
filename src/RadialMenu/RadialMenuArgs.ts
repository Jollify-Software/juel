import { MenuItem } from "../_Core/MenuItem";

export interface RadialMenuArgs {
    parent?: HTMLElement
    size?:number
    onClick?: (item: MenuItem) => void
    menuItems?: MenuItem[]
    closeOnClick?: boolean
}