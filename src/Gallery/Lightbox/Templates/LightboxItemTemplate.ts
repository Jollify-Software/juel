import { LightboxItem } from "../LightboxItem";
import { imageTemplate } from "./ImageTemplate";
import { youYouTubeEmbedTemplate } from "./YouTubeEmbedTemplate";

export function lightboxItemTemplate(item: LightboxItem) {
    console.log(item);
    switch (item.type) {
        case "image":
            return imageTemplate(item);
        case "video":
            if (item.platform && item.platform.startsWith("youtu")) {
                return youYouTubeEmbedTemplate(item);
            }
    }
}