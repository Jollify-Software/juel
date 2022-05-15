import { JuelComponent } from "../_Base/JuelComponent";

export function Dispatch<TArgs>(el: JuelComponent, name: string, args: TArgs) {
    let evt = new CustomEvent<TArgs>(name, {
        detail: args
    });
    el.dispatchEvent(evt);
    if (el.juelParent) {
        el.juelParent.dispatchEvent(evt);
    }
}