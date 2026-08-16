export function ElementFromHtml<T extends HTMLElement = HTMLElement>(html: string): T {
    let template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild as T;
}
