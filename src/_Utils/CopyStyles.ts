export function CopyStyles(styles: CSSStyleDeclaration, element: HTMLElement) {
    // Loop through each computed style and apply it to the target element
for (let i = 0; i < styles.length; i++) {
    const property = styles[i];
    if (property == 'visibility') {
        continue;
    }
    element.style.setProperty(property, styles.getPropertyValue(property));
}
}