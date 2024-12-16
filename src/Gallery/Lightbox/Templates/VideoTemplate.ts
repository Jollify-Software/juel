import { html } from "lit";
import { LightboxItem } from "../LightboxItem";

export function videoTemplate(item: LightboxItem) {
    return html`<video width="100%" height="100%" src="${item.src}" controls>`;
}