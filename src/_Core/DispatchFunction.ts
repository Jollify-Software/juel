export function Dispatch<TArgs>(el: HTMLElement, name: string, args: TArgs) {
    let evt = new CustomEvent<TArgs>(name, {
        detail: args
    });
    el.dispatchEvent(evt);
}