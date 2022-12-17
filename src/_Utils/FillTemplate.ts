import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html";

export function FillTemplate(templateString: string, data: any): TemplateResult {
    console.log(data);
    let regex = /((?<!".+)this(\.\w+)+(?!.+"))/g;
    if (regex.test(templateString)) {
        templateString = templateString.replace(/((?<!".+)this(\.\w+)+(?!.+"))/g, "unsafeHTML($1)");
    }
    console.log(templateString);
    return new Function('html', 'unsafeHTML', "return html`"+templateString +"`;").call(data, html, unsafeHTML);
};

export function FillTemplateUnsafe(templateString: string, data: any): TemplateResult {
    let regex = /(this(\.\w+)+)/g;
    if (regex.test(templateString)) {
        templateString = templateString.replace(/(this(\.\w+)+)/g, "unsafeHTML($1)");
    }
    return new Function('html', 'unsafeHTML', "return html`"+templateString +"`;").call(data, html, unsafeHTML);
};