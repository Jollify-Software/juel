export function isOverflown(element) {
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}
export function isOverflownX(element) {
    return element.scrollWidth > element.clientWidth;
}
export function isOverflownY(element: HTMLElement) {
    let sub = 0;
    let juelMedia = element.querySelector('juel-media[background="true"]');
    if (juelMedia) {
        return false;
    }
    return (element.scrollHeight - sub) > (element.clientHeight);
}