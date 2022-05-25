import { html } from "lit";
import { ExternalMediaTemplateInfo } from "../_Core/ExternalMediaTemplateInfo";

export module ExternalMediaModule {
    export var youtube: ExternalMediaTemplateInfo = {
        regexp: /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
        link: 'https://youtube.com',
        linkText: 'YouTube',
        template: (info) => {
            return html`<iframe width="560" height="315" src="https://www.youtube.com/embed/${info.id}" title="YouTube video player" frameborder="0" allowfullscreen></iframe>`
        }
    }
}