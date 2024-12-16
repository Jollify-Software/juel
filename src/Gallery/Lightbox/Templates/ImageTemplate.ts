import { html } from "lit";
import { LightboxItem } from "../LightboxItem";

export function imageTemplate(item: LightboxItem) {
    return html`<img src="${item.src}" />`;
}