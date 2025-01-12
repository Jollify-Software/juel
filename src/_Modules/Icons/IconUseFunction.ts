import { IconGet } from "./IconGetFunction";

export function IconUse(name: string, svg = true) {
    let iconsSection = $("#juel-icons");
    if (iconsSection.length <= 0) {
        iconsSection = $('<section id="juel-icons" />');
        iconsSection.css("visible", "hidden");
        iconsSection.prependTo(document.body);
    }
    if (iconsSection.children(`#icon-${name}-container`).length <= 0) {
        let icon = IconGet(name);
        if (icon) {
            let iconSvg = $(icon);
            let viewBox = iconSvg.attr("viewBox");
            if (iconSvg.children(`#icon-${name}`).length <= 0) {
                    iconSvg.children().wrapAll($(`<symbol id="icon-${name}" />`)
                        .attr("viewBox", viewBox));
            }
            iconSvg.attr("id", `icon-${name}-container`);
            iconSvg.appendTo(iconsSection);
            console.log(iconSvg.html());
        }
    }
    if (svg) {
        return `<svg><use href="#icon-${name}"></svg>`;
    } else {
        return `<use href="#icon-${name}">`;
    }
}