import { IconifyMap } from "./IconifyMap";

export function Iconify(element: HTMLUListElement = null) {
    let uls: HTMLUListElement[];
    if (!element) {
        uls = Array.from(document.querySelectorAll('ul'));
    } else {
        uls = [ element ];
    }
    for (let ul of uls) {
        let lis = Array.from(ul.querySelectorAll('li'));
        for (let li of lis) {
            for (let icon of IconifyMap()) {
                if (li.innerHTML.match(icon.pattern)) {
                    let value: string = `<span class="icon sm ${icon.icon}"></span>`;
                    if (icon.color) {
                        value = `<span class="icon sm ${icon.icon} background-${icon.color}"></span>`;
                    }
                    li.innerHTML = li.innerHTML.replace(icon.pattern, (match, code, klass, href) => {
                        let str = value;
                        //klass = klass.replace('-', ' ');
                        if (!klass) {
                            
                        } else if (klass.includes('background')) {
                            str = `<span class="icon sm ${icon.icon} ${klass}"></span>`;
                        } else {
                            str = `<span class="icon sm ${icon.icon} background-${klass}"></span>`;
                        }
                        if (href) {
                            str = `<a href="${href}">${str}</a>`;
                        }
                        return str;    
                    });
                }
            }
        }
    }
}