export module IconsModule {
    export var get = (name: string, svg = true): string => {
        let style = getComputedStyle(document.body);
        let icon = style.getPropertyValue(`--icon-${name}`);
        if (icon) {
            var data = /(?<=url\().*(?=\))/.exec(icon)[0];
            let splitty = data.split(',');
            if (splitty.length > 1) {
                let decoded = (<any>decodeURIComponent(splitty[1]))
                    .replaceAll('\\', '');
                if (svg) {
                    return decoded;
                } else {
                    let iconSvg = $(decoded as string);
                    return iconSvg[0].innerHTML;
                }
            }
        }
        return '';
    }
    export var use = (name: string, svg = true) => {
        let iconsSection = $("#juel-icons");
        if (iconsSection.length <= 0) {
            iconsSection = $('<section id="juel-icons" />');
            iconsSection.css("visible", "hidden");
            iconsSection.prependTo(document.body);
        }
        if (iconsSection.children(`#icon-${name}-container`).length <= 0) {
            let icon = get(name);
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
}