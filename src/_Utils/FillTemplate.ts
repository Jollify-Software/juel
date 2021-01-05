export function FillTemplate(templateString: string, data: any): string {
    return new Function("return html`"+templateString +"`;").call(data);
};