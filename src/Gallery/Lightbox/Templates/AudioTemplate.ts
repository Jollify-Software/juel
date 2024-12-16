import { html } from "lit";
import { LightboxItem } from "../LightboxItem";

export function audioTemplate(item: LightboxItem) {
    return html`<video width="100%" height="100%" src="${item.src}" controls>`;
}