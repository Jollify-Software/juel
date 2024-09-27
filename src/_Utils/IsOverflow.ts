export function isOverflown(element) {
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}
export function isOverflownX(element) {
    return element.scrollWidth > element.clientWidth;
}
export function isOverflownY(element) {
    return element.scrollHeight > element.clientHeight;
}