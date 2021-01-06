import { customElement, html, LitElement } from "lit-element";
import { DragMoveListener } from "../_Utils/DragMoveListener";
import { emojiRegex } from "../_Utils/EmojiRegex";
import interact from '@interactjs/interactjs';

@customElement("juel-draggable")
export class DraggableContainer extends LitElement {

    constructor() {
        super();
        if (!('interact' in window)) {
            window['interact'] = interact;
            }
    }

    firstUpdated() {
        let html = this.innerHTML as any;
        html = html.replaceAll(emojiRegex, '<div>$1</div>');
        this.innerHTML = html;

        interact("juel-draggable *")
                .draggable({
                    listeners: {
                        // call this function on every dragmove event
                        move: DragMoveListener
                    }
                });
    }
    
    render() {
        return html`<div>
            <slot></slot>
        <div>`;
    }
}