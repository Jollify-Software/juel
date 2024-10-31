export module IconsModule {
    export var get = (name: string) => {
        let style = getComputedStyle(document.body);
        let icon = style.getPropertyValue(`--icon-${name}`);
        if (icon) {
            var data = /(?<=url\().*(?=\))/.exec(icon)[0];
            let splitty = data.split(',');
            if (splitty.length > 1) {
                let decoded = (<any>decodeURIComponent(splitty[1]))
                    .replaceAll('\\', '');
                return decoded;
            }
        }
        return '';
    }
    export var use = (name: string) => {
        return `<svg><use href="#icon-${name}"></svg>`;
    }
}