import { IconGet } from "./IconGetFunction";

const SVG_NS = "http://www.w3.org/2000/svg";

export function IconUse(name: string, svg = true) {
    let iconsSection = document.getElementById("juel-icons");
    if (!iconsSection) {
        iconsSection = document.createElement("section");
        iconsSection.id = "juel-icons";
        // Visually hidden but still rendered — <use> can fail to find its
        // symbol under display:none in some browsers, so this clips it to
        // zero size instead of hiding it outright.
        Object.assign(iconsSection.style, {
            position: "absolute",
            width: "0",
            height: "0",
            overflow: "hidden",
        });
        document.body.prepend(iconsSection);
    }

    if (!iconsSection.querySelector(`#icon-${name}-container`)) {
        let icon = IconGet(name);
        if (icon) {
            // icon is a "<svg ...>...</svg>" string, so parsing it via
            // innerHTML correctly creates it (and its children) in the SVG
            // namespace.
            let temp = document.createElement("div");
            temp.innerHTML = icon;
            let iconSvg = temp.firstElementChild as SVGSVGElement | null;

            if (iconSvg && !iconSvg.querySelector(`#icon-${name}`)) {
                let viewBox = iconSvg.getAttribute("viewBox");
                // Must be created via createElementNS rather than by parsing
                // a standalone "<symbol>" string — a bare (non-<svg>-wrapped)
                // string lands in the HTML namespace, where "viewBox" gets
                // lowercased to "viewbox" and the browser's SVG renderer
                // ignores the element entirely. That's why <use> referencing
                // it used to render nothing at all.
                let symbol = document.createElementNS(SVG_NS, "symbol");
                symbol.id = `icon-${name}`;
                if (viewBox) {
                    symbol.setAttribute("viewBox", viewBox);
                }
                while (iconSvg.firstChild) {
                    symbol.appendChild(iconSvg.firstChild);
                }
                iconSvg.appendChild(symbol);
            }

            if (iconSvg) {
                iconSvg.id = `icon-${name}-container`;
                iconsSection.appendChild(iconSvg);
            }
        }
    }

    if (svg) {
        return `<svg><use href="#icon-${name}"></use></svg>`;
    } else {
        return `<use href="#icon-${name}"></use>`;
    }
}
