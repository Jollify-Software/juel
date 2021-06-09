export function TriggerClick(id: string) {
    let el = document.getElementById(id) as HTMLElement;
    if (el) {
        $(el).trigger('click');
    }
}