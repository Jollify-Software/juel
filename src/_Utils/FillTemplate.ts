import { html, TemplateResult } from "lit-element";

export function FillTemplate(templateString: string, data: any): TemplateResult {
    return new Function('html', "return html`"+templateString +"`;").call(data, html);
};