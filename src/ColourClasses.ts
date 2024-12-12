import { AlertTypes } from "./_Core/AlertTypes";

const styleProperties = [ "color", "background", "stroke", "fill", "width", "height", "top", "right", "bottom", "left", "padding" ];
const colourProperties = [ "color", "background", "stroke", "fill" ];

export function ColourClasses() {
    let selector = styleProperties
        .map(x => `[class*="${x}-"]`)
        .join(" ,");
    let elements = document.querySelectorAll<HTMLElement>(selector);
    // TODO: bg, fill stroke
    for (let element of elements) {
        for (let klass of element.classList) {
            if (styleProperties.some(x => klass.startsWith(x))) {
                setColor(element, klass)
            }
        }
    }
}

function setColor(element: HTMLElement, klass: string) {
    let splitty = klass.split('-');
    let name = splitty[0];
    let color = splitty[1];
    if (splitty.length == 3 && color == "var") {
        if (element.nodeName.toLowerCase().startsWith("juel-")) {
            element.style.setProperty(`--${name}`, `var(--${splitty[2]})`);
        } else {
            element.style[name] = `var(--${splitty[2]})`;
        }
    } else if (Object.values(AlertTypes).includes(color as AlertTypes)) {
        if (element.nodeName.toLowerCase().startsWith("juel-")) {
            element.style.setProperty(`--${name}`, `var(--${color})`);
        } else {
            element.style[name] = `var(--${color})`;
        }
    } else {
        if (element.nodeName.toLowerCase().startsWith("juel-") && colourProperties.some(x => x == name)) {
            element.style.setProperty(`--${name}`, `var(--${color})`);
        } else {
            element.style[name] = color;
        }
    }
}