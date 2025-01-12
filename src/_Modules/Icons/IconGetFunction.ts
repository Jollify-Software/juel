export function IconGet(name: string, svg: boolean = true): string {
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