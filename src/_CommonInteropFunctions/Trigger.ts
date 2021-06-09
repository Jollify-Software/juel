export function Trigger(id: string, eventName: string) {
    let el = document.getElementById(id) as HTMLElement;
    if (el) {
        $(el).trigger(eventName);
    }
}