import { html } from "lit";
import { LightboxItem } from "../LightboxItem";
import { getYouTubeVideoID } from "../../../_Utils/String/getYouTubeVideoID";

export function youYouTubeEmbedTemplate(item: LightboxItem) {
    let src = getYouTubeVideoID(item.src);
    return html`<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${src}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}