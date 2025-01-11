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

/**
 * Sets the color of a given HTML element based on the provided class string.
 * The class string is expected to be in the format 'property-value' or 'property-var-value'.
 * 
 * @param element - The HTML element whose color will be set.
 * @param klass - A string representing the color class, formatted as 'property-value' or 'property-var-value'.
 */
function setColor(element: HTMLElement, klass: string) {
    // Split the class string into parts using '-' as the delimiter
    let splitty = klass.split('-');
    
    let sliceIndex = 1;
    // Extract the name and color from the split parts
    let name = splitty[0]; // The first part is the property name
    let color = splitty[1]; // The second part is the color value
    if (color == "var") {
        sliceIndex = 2;
        color = `var(--${splitty[2]}`;
    }
    const colors = splitty.slice(sliceIndex).map((str) => {
        if (Object.values(AlertTypes).includes(str as AlertTypes)) {
            return `var(--${str})`;
        } else {
            return str;
        }
    });
    

    // If only one color
    if (colors.length == 1) {
        // If the element's node name starts with 'juel-', set a CSS variable
        if (element.nodeName.toLowerCase().startsWith("juel-")) {
            element.style.setProperty(`--${name}`, colors[0]); // Set CSS variable
        } else {
            // Otherwise, set the style property directly
            element.style[name] = colors[0]; // Set style property
        }
    } else { // More colors = gradient
        const value = `linear-gradient(${colors.join(', ')})`;
        console.log(value);
        // If the element's node name starts with 'juel-' and the name is a valid color property
        if (element.nodeName.toLowerCase().startsWith("juel-")) {
            element.style.setProperty(`--${name}`, value); // Set CSS variable
        } else {
            // Otherwise, set the style property directly
            element.style[name] = value; // Set style property
        }
    }
}