import { html, LitElement } from "lit";
import { property, customElement } from "lit/decorators";
import { DragMoveListener } from "../_Utils/DragMoveListener";
import { emojiRegex } from "../_Utils/EmojiRegex";
import interact from '@interactjs/interactjs';
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-draggable")
export class DraggableContainer extends JuelComponent {

    constructor() {
        super();
        if (!('interact' in window)) {
            window['interact'] = interact;
            }
    }

    firstLoad() {
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