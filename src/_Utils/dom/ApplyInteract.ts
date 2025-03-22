import interact from "@interactjs/interactjs";
import { Interactable } from "@interactjs/core/Interactable";
import { wrapEmojis } from "./WrapEmojis";

export function applyInteract(elements: HTMLElement[], interactFunction: (interact: Interactable) => void) {
    for (let element of elements) {
        //wrapEmojis(element);
        interactFunction(interact(element));
        // Apply to children
        let children = element.children;
        if ((!children) || (children.length == 0)) {
            continue;
        }
        for (let child of children) {
            applyInteract([child as HTMLElement], interactFunction);
        }
    }
}